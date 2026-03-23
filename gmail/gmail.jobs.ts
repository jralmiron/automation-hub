import { buildGmailSummary } from "./gmail.service.js";

export async function buildDailyEmailSummary(lines: string[]) {
  return buildGmailSummary("Automation Hub - resumen diario", lines.join("\n"));
}
