import { env } from "../src/config/env.js";
import type { InboxMessage } from "./gmail.automation.js";
import { getGoogleAccessToken } from "../google/google-oauth.service.js";

function parseVipEmails() {
  return (env.VIP_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function gmailRequest<T>(path: string, init?: RequestInit) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Gmail devolvió ${response.status}`);
  }
  return payload;
}

function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function getMessageMetadata(id: string) {
  const payload = await gmailRequest<{
    id: string;
    threadId?: string;
    snippet?: string;
    labelIds?: string[];
    payload?: { headers?: Array<{ name?: string; value?: string }> };
  }>(`messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);

  return {
    id: payload.id,
    threadId: payload.threadId,
    from: headerValue(payload.payload?.headers, "From") || "Remitente desconocido",
    subject: headerValue(payload.payload?.headers, "Subject") || "Sin asunto",
    date: headerValue(payload.payload?.headers, "Date") || "",
    snippet: payload.snippet,
    labelIds: payload.labelIds ?? [],
  } satisfies InboxMessage;
}

async function searchMessages(query: string, maxResults = 10) {
  const payload = await gmailRequest<{ messages?: Array<{ id: string }> }>(
    `messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
  );
  const ids = payload.messages?.map((item) => item.id) ?? [];
  return Promise.all(ids.map((id) => getMessageMetadata(id)));
}

function uniqueById(messages: InboxMessage[]) {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }
    seen.add(message.id);
    return true;
  });
}

function formatList(title: string, messages: InboxMessage[]) {
  if (messages.length === 0) {
    return `${title}\n- Nada relevante.`;
  }

  const lines = [title];
  for (const [index, message] of messages.entries()) {
    lines.push(`${index + 1}. ${message.subject} — ${message.from}`);
  }
  return lines.join("\n");
}

export async function getUrgentEmails(maxResults = 5) {
  const vipEmails = parseVipEmails();
  const keywordQuery =
    'in:inbox (urgent OR urgente OR factura OR invoice OR reunión OR reunion OR pago OR payment) newer_than:7d';
  const vipQuery =
    vipEmails.length > 0
      ? `in:inbox (${vipEmails.map((email) => `from:${email}`).join(" OR ")}) newer_than:14d`
      : "";

  const [keywords, vip] = await Promise.all([
    searchMessages(keywordQuery, maxResults).catch(() => []),
    vipQuery ? searchMessages(vipQuery, maxResults).catch(() => []) : Promise.resolve([]),
  ]);

  return {
    ok: true as const,
    messages: uniqueById([...vip, ...keywords]).slice(0, maxResults),
  };
}

export async function getPurchaseEmails(maxResults = 8) {
  return {
    ok: true as const,
    messages: await searchMessages(
      'in:inbox (pedido OR order OR compra OR shipping OR envío OR delivered OR entrega)',
      maxResults,
    ),
  };
}

export async function getFinancialEmails(maxResults = 8) {
  return {
    ok: true as const,
    messages: await searchMessages(
      'in:inbox (factura OR invoice OR receipt OR pago OR payment OR cobro OR subscription OR suscripción)',
      maxResults,
    ),
  };
}

export async function getNewsletterEmails(maxResults = 20) {
  return {
    ok: true as const,
    messages: await searchMessages(
      'in:inbox (label:^smartlabel_promo OR newsletter OR unsubscribe OR digest OR noreply)',
      maxResults,
    ),
  };
}

async function ensureLabel(labelName: string) {
  const labels = await gmailRequest<{ labels?: Array<{ id: string; name: string }> }>("labels");
  const existing = labels.labels?.find((label) => label.name === labelName);
  if (existing) {
    return existing.id;
  }

  const created = await gmailRequest<{ id: string }>("labels", {
    method: "POST",
    body: JSON.stringify({
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  return created.id;
}

export async function cleanupNewsletters(maxResults = 20) {
  const labelId = await ensureLabel("Auto/Newsletters");
  const newsletters = await getNewsletterEmails(maxResults);
  let updated = 0;

  for (const message of newsletters.messages) {
    if (message.labelIds.includes(labelId)) {
      continue;
    }

    await gmailRequest(`messages/${message.id}/modify`, {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: [labelId],
      }),
    });
    updated += 1;
  }

  return {
    ok: true as const,
    total: newsletters.messages.length,
    updated,
    messages: newsletters.messages,
  };
}

export async function getUnansweredTaskReminders(hours = 24, maxResults = 10) {
  const olderThanDays = Math.max(1, Math.floor(hours / 24));
  const messages = await searchMessages(
    `in:inbox is:important older_than:${olderThanDays}d -from:me`,
    maxResults,
  );

  return {
    ok: true as const,
    hours,
    messages,
  };
}

export function formatUrgentEmailsTelegramMessage(result: Awaited<ReturnType<typeof getUrgentEmails>>) {
  return formatList("<b>Correos urgentes</b>", result.messages);
}

export function formatPurchaseTelegramMessage(result: Awaited<ReturnType<typeof getPurchaseEmails>>) {
  return formatList("<b>Seguimiento de compras</b>", result.messages);
}

export function formatFinancialTelegramMessage(result: Awaited<ReturnType<typeof getFinancialEmails>>) {
  return formatList("<b>Resumen financiero</b>", result.messages);
}

export function formatNewsletterCleanupTelegramMessage(result: Awaited<ReturnType<typeof cleanupNewsletters>>) {
  return [
    "<b>Limpieza de newsletters</b>",
    `Detectados: ${result.total}`,
    `Etiquetados: ${result.updated}`,
  ].join("\n");
}

export function formatUnansweredTelegramMessage(result: Awaited<ReturnType<typeof getUnansweredTaskReminders>>) {
  return formatList(
    `<b>Tareas sin responder (${result.hours}h)</b>`,
    result.messages,
  );
}
