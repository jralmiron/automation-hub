import { handleTelegramWebhookRequest } from "../../src/telegram-bridge/telegram-webhook.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method-not-allowed" });
    return;
  }

  const rawHeader =
    req.headers?.["x-telegram-bot-api-secret-token"] ??
    req.headers?.["X-Telegram-Bot-Api-Secret-Token"];
  const headerSecret =
    typeof rawHeader === "string"
      ? rawHeader.trim()
      : Array.isArray(rawHeader)
        ? String(rawHeader[0] ?? "").trim()
        : undefined;
  const querySecret =
    typeof req.query?.secret === "string"
      ? req.query.secret.trim()
      : Array.isArray(req.query?.secret)
        ? String(req.query.secret[0] ?? "").trim()
        : undefined;

  const result = await handleTelegramWebhookRequest({
    body: req.body,
    secretHeader: headerSecret || querySecret,
  });

  res.status(result.status).json(result.body);
}
