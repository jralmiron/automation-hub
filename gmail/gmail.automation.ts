import { getGoogleAccessToken } from "../google/google-oauth.service.js";

export type InboxMessage = {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  snippet?: string;
  labelIds: string[];
};

const AUTO_LABELS = {
  Trabajo: "Auto/Trabajo",
  Compras: "Auto/Compras",
  Finanzas: "Auto/Finanzas",
  Newsletters: "Auto/Newsletters",
  Personal: "Auto/Personal",
} as const;

type AutoCategory = keyof typeof AUTO_LABELS;

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
    const message = payload?.error?.message || `Gmail devolvió ${response.status}`;
    throw new Error(message);
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

function normalize(input: string) {
  return input.toLowerCase();
}

function classifyMessage(message: InboxMessage): AutoCategory {
  const haystack = normalize(`${message.from} ${message.subject} ${message.snippet ?? ""}`);

  const financeKeywords = [
    "invoice",
    "factura",
    "billing",
    "payment",
    "pago",
    "paypal",
    "stripe",
    "receipt",
    "bank",
    "banco",
    "suscripción",
    "subscription",
  ];
  if (financeKeywords.some((keyword) => haystack.includes(keyword))) {
    return "Finanzas";
  }

  const shoppingKeywords = [
    "amazon",
    "pedido",
    "order",
    "shipment",
    "envío",
    "shipping",
    "compra",
    "booking",
    "aliexpress",
    "wallapop",
  ];
  if (shoppingKeywords.some((keyword) => haystack.includes(keyword))) {
    return "Compras";
  }

  const newsletterKeywords = [
    "unsubscribe",
    "newsletter",
    "digest",
    "noreply",
    "no-reply",
    "promoción",
    "promo",
    "daily update",
    "weekly update",
  ];
  if (newsletterKeywords.some((keyword) => haystack.includes(keyword))) {
    return "Newsletters";
  }

  const workKeywords = [
    "github",
    "gitlab",
    "jira",
    "notion",
    "slack",
    "vercel",
    "supabase",
    "trigger.dev",
    "meet",
    "zoom",
    "teams",
    "reunión",
    "meeting",
    "project",
    "proyecto",
  ];
  if (workKeywords.some((keyword) => haystack.includes(keyword))) {
    return "Trabajo";
  }

  return "Personal";
}

async function listLabels() {
  const payload = await gmailRequest<{ labels?: Array<{ id: string; name: string }> }>("labels");
  return payload.labels ?? [];
}

async function createLabel(name: string) {
  return gmailRequest<{ id: string; name: string }>("labels", {
    method: "POST",
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
}

async function ensureAutoLabels() {
  const labels = await listLabels();
  const map = new Map(labels.map((label) => [label.name, label.id]));

  for (const name of Object.values(AUTO_LABELS)) {
    if (!map.has(name)) {
      const created = await createLabel(name);
      map.set(created.name, created.id);
    }
  }

  return map;
}

export async function getInboxTopMessages(maxResults = 5) {
  const payload = await gmailRequest<{
    messages?: Array<{ id: string }>;
    resultSizeEstimate?: number;
  }>(`messages?labelIds=INBOX&maxResults=${maxResults}`);

  const ids = payload.messages?.map((item) => item.id) ?? [];
  const messages = await Promise.all(ids.map((id) => getMessageMetadata(id)));
  return {
    ok: true as const,
    total: messages.length,
    messages,
  };
}

export function formatInboxTelegramMessage(
  inbox:
    | { ok: true; total: number; messages: InboxMessage[] }
    | { ok: false; error: string },
) {
  if (!inbox.ok) {
    return `<b>Inbox</b>\nNo pude leer Gmail.\n${inbox.error}`;
  }

  if (inbox.messages.length === 0) {
    return "<b>Inbox</b>\nNo hay correos en bandeja de entrada.";
  }

  const lines = ["<b>Primeros 5 correos de tu bandeja</b>"];
  for (const [index, message] of inbox.messages.entries()) {
    lines.push(`${index + 1}. <b>${message.subject}</b>`);
    lines.push(`   De: ${message.from}`);
  }
  return lines.join("\n");
}

export async function organizeInboxByCategories(maxResults = 50) {
  const labels = await ensureAutoLabels();
  const autoLabelIds = Object.values(AUTO_LABELS)
    .map((name) => labels.get(name))
    .filter((value): value is string => Boolean(value));
  const inbox = await getInboxTopMessages(maxResults);

  const counters: Record<AutoCategory, number> = {
    Trabajo: 0,
    Compras: 0,
    Finanzas: 0,
    Newsletters: 0,
    Personal: 0,
  };

  let updated = 0;
  for (const message of inbox.messages) {
    const category = classifyMessage(message);
    const targetLabelName = AUTO_LABELS[category];
    const targetLabelId = labels.get(targetLabelName);
    if (!targetLabelId) {
      continue;
    }

    const removeLabelIds = autoLabelIds.filter((labelId) => labelId !== targetLabelId && message.labelIds.includes(labelId));
    const alreadyHasTarget = message.labelIds.includes(targetLabelId);
    counters[category] += 1;

    if (alreadyHasTarget && removeLabelIds.length === 0) {
      continue;
    }

    await gmailRequest(`messages/${message.id}/modify`, {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: alreadyHasTarget ? [] : [targetLabelId],
        removeLabelIds,
      }),
    });
    updated += 1;
  }

  return {
    ok: true as const,
    processed: inbox.messages.length,
    updated,
    counters,
  };
}

export function formatOrganizerTelegramMessage(
  result:
    | { ok: true; processed: number; updated: number; counters: Record<AutoCategory, number> }
    | { ok: false; error: string },
) {
  if (!result.ok) {
    return `<b>Organización de email</b>\nNo se pudo organizar Gmail.\n${result.error}`;
  }

  const lines = [
    "<b>Organización de email</b>",
    `Correos revisados: ${result.processed}`,
    `Correos actualizados: ${result.updated}`,
    `Trabajo: ${result.counters.Trabajo}`,
    `Compras: ${result.counters.Compras}`,
    `Finanzas: ${result.counters.Finanzas}`,
    `Newsletters: ${result.counters.Newsletters}`,
    `Personal: ${result.counters.Personal}`,
  ];
  return lines.join("\n");
}
