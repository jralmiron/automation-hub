import { env } from "../src/config/env.js";

export async function sendTelegramMessage(text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, skipped: true, reason: "Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID" };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    },
  );

  const data = await response.json();
  return { ok: response.ok, data };
}
