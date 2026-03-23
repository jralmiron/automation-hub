import { buildDailyEmailSummary } from "../gmail/gmail.jobs.js";
import { recordSupabaseHeartbeat } from "../supabase/supabase.jobs.js";
import { notifyTelegramDailySummary } from "../telegram/telegram.jobs.js";
import { runTriggerHealthcheck } from "../trigger/trigger.jobs.js";

export async function runDailyAutomationCycle(source = "daily") {
  const trigger = await runTriggerHealthcheck().catch((error) => ({ ok: false, error: String(error) }));
  const supabase = await recordSupabaseHeartbeat(source).catch((error) => ({ error: String(error) }));

  const lines = [
    `Fuente: ${source}`,
    `Fecha: ${new Date().toISOString()}`,
    `Trigger.dev: ${JSON.stringify(trigger)}`,
    `Supabase: ${JSON.stringify(supabase)}`,
  ];

  const telegram = await notifyTelegramDailySummary(lines).catch((error) => ({ ok: false, error: String(error) }));
  const email = await buildDailyEmailSummary(lines);

  return {
    source,
    trigger,
    supabase,
    telegram,
    email,
  };
}

export async function runManualAutomation(job: string, payload: Record<string, unknown>) {
  if (job === "telegram") {
    const text = String(payload.text ?? "Mensaje manual desde automation-hub");
    return notifyTelegramDailySummary([text]);
  }

  if (job === "trigger") {
    return runTriggerHealthcheck();
  }

  if (job === "supabase") {
    return recordSupabaseHeartbeat("manual");
  }

  return runDailyAutomationCycle("manual-fallback");
}
