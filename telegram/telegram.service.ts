import { env } from "../src/config/env.js";

export async function sendTelegramMessage(text: string, chatId = env.TELEGRAM_CHAT_ID) {
  if (!env.TELEGRAM_BOT_TOKEN || !chatId) {
    return { ok: false, skipped: true, reason: "Faltan TELEGRAM_BOT_TOKEN o chat_id" };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    },
  );

  const data = await response.json();
  return { ok: response.ok, data };
}
