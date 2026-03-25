import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { redactSecrets } from "../lib/redact.js";
import { sendTelegramMessage } from "../../telegram/telegram.service.js";
import {
  getHelpMessage,
  normalizeText,
  parseDirectCommand,
  type CommandIntent,
} from "./command-intents.js";
import { parseIntentWithDeepSeek } from "./deepseek.service.js";
import { dispatchManualWorkflow, getLatestWorkflowStatus } from "./github-actions.service.js";

type WebhookRequest = {
  body: unknown;
  secretHeader?: string | null;
};

type WebhookResponse = {
  status: number;
  body: Record<string, unknown>;
};

function getAllowedChatIds() {
  const list = env.TELEGRAM_ALLOWED_CHAT_IDS ?? env.TELEGRAM_CHAT_ID ?? "";
  return list
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAuthorizedChat(chatId: string) {
  return getAllowedChatIds().includes(chatId);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function extractMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const message = (payload.message ?? payload.edited_message) as Record<string, unknown> | undefined;
  if (!message) {
    return null;
  }

  const text = message.text;
  const chat = message.chat as Record<string, unknown> | undefined;
  const from = message.from as Record<string, unknown> | undefined;
  const chatId = chat?.id;
  return {
    text: typeof text === "string" ? text : "",
    chatId: typeof chatId === "number" || typeof chatId === "string" ? String(chatId) : "",
    username: typeof from?.username === "string" ? from.username : undefined,
  };
}

async function resolveIntent(text: string): Promise<CommandIntent> {
  const direct = parseDirectCommand(text);
  if (direct) {
    return direct;
  }

  return parseIntentWithDeepSeek(text);
}

function buildStatusText(status: Awaited<ReturnType<typeof buildBridgeStatus>>) {
  const lines = [
    "<b>Estado del bridge</b>",
    `Webhook secreto: ${status.webhookSecretConfigured ? "OK" : "pendiente"}`,
    `DeepSeek: ${status.deepseekConfigured ? "OK" : "pendiente"}`,
    `GitHub dispatch: ${status.githubConfigured ? "OK" : "pendiente"}`,
    `Chat autorizado: ${status.authorizedChatsCount}`,
  ];

  if (status.latestWorkflow?.run) {
    lines.push("");
    lines.push("<b>Último workflow</b>");
    lines.push(`Estado: ${status.latestWorkflow.run.status}`);
    lines.push(`Conclusión: ${status.latestWorkflow.run.conclusion ?? "pendiente"}`);
    lines.push(`Evento: ${status.latestWorkflow.run.event}`);
    lines.push(`Fecha: ${status.latestWorkflow.run.created_at}`);
    lines.push(status.latestWorkflow.run.html_url);
  }

  return lines.join("\n");
}

function formatDispatchSuccess(intent: CommandIntent, result: Awaited<ReturnType<typeof dispatchManualWorkflow>>) {
  const lines = [
    "<b>Orden aceptada</b>",
    `Intent: ${intent.intent}`,
    `Job: ${result.job}`,
    `Workflow: ${result.workflow}`,
    `Ref: ${result.ref}`,
    `Repo: ${result.owner}/${result.repo}`,
  ];

  if (intent.text) {
    lines.push(`Texto: ${escapeHtml(intent.text)}`);
  }

  return lines.join("\n");
}

async function processAuthorizedMessage(chatId: string, text: string) {
  const cleanText = normalizeText(text);
  const intent = await resolveIntent(cleanText);

  if (intent.intent === "help") {
    await sendTelegramMessage(getHelpMessage(), chatId);
    return { ok: true, intent };
  }

  if (intent.intent === "status") {
    const status = await buildBridgeStatus();
    await sendTelegramMessage(buildStatusText(status), chatId);
    return { ok: true, intent, status };
  }

  if (intent.intent === "run_manual_job" && intent.job) {
    const result = await dispatchManualWorkflow(intent.job, intent.text);
    await sendTelegramMessage(formatDispatchSuccess(intent, result), chatId);
    return { ok: true, intent, result };
  }

  await sendTelegramMessage(
    [
      "<b>No he podido interpretar una acción segura.</b>",
      "Prueba con /help o usa frases como:",
      "• ejecuta el flujo diario",
      "• corre trigger",
      "• dame el estado",
    ].join("\n"),
    chatId,
  );
  return { ok: true, intent };
}

export async function buildBridgeStatus() {
  const latestWorkflow = await getLatestWorkflowStatus();
  return {
    ok: true,
    app: "automation-hub",
    bridge: "telegram-deepseek-github-actions",
    webhookSecretConfigured: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
    deepseekConfigured: Boolean(env.DEEPSEEK_API_KEY),
    githubConfigured: Boolean(env.GITHUB_TOKEN),
    authorizedChatsCount: getAllowedChatIds().length,
    latestWorkflow,
    time: new Date().toISOString(),
  };
}

export async function handleTelegramWebhookRequest({ body, secretHeader }: WebhookRequest): Promise<WebhookResponse> {
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn("Telegram webhook rejected by secret header");
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }

  const message = extractMessage(body);
  if (!message) {
    return { status: 200, body: { ok: true, ignored: true, reason: "no-message" } };
  }

  if (!message.chatId || !isAuthorizedChat(message.chatId)) {
    logger.warn("Telegram chat not authorized", { chatId: message.chatId });
    return { status: 200, body: { ok: true, ignored: true, reason: "unauthorized-chat" } };
  }

  if (!message.text) {
    await sendTelegramMessage("Solo puedo procesar mensajes de texto.", message.chatId);
    return { status: 200, body: { ok: true, ignored: true, reason: "non-text-message" } };
  }

  try {
    const result = await processAuthorizedMessage(message.chatId, message.text);
    return { status: 200, body: { ok: true, result } };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    logger.error("Telegram bridge error", redactSecrets(messageText));
    await sendTelegramMessage(
      `<b>Error ejecutando la orden</b>\n${escapeHtml(messageText)}`,
      message.chatId,
    ).catch(() => undefined);
    return { status: 200, body: { ok: false, error: "bridge-error" } };
  }
}
