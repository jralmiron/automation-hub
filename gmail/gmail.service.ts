import { env } from "../src/config/env.js";

export async function buildGmailSummary(subject: string, body: string) {
  return {
    to: env.GMAIL_SUMMARY_TO ?? "",
    subject,
    body,
    ready: Boolean(env.GMAIL_SUMMARY_TO),
  };
}
