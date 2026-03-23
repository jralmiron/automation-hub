import { sendTelegramMessage } from "./telegram.service.js";

export async function notifyTelegramDailySummary(lines: string[]) {
  return sendTelegramMessage(lines.join("\n"));
}
