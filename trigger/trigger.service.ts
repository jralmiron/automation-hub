import { env } from "../src/config/env.js";

export async function pingTriggerDev(note: string) {
  if (!env.TRIGGER_API_KEY) {
    return { ok: false, skipped: true, reason: "Falta TRIGGER_API_KEY" };
  }

  const response = await fetch(`${env.TRIGGER_API_URL}/api/v1/whoami`, {
    headers: {
      Authorization: `Bearer ${env.TRIGGER_API_KEY}`,
      Accept: "application/json",
      "x-automation-note": note,
    },
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}
