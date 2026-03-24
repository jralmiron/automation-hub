import { buildDailyEmailSummary } from "../gmail/gmail.jobs.js";
import { recordSupabaseHeartbeat } from "../supabase/supabase.jobs.js";
import { notifyTelegramDailySummary } from "../telegram/telegram.jobs.js";
import { runTriggerHealthcheck } from "../trigger/trigger.jobs.js";
import type { TriggerHealthcheckResult } from "../trigger/trigger.types.js";

function formatTriggerSummary(trigger: TriggerHealthcheckResult) {
  if (!trigger.ok) {
    if ("skipped" in trigger && trigger.skipped) {
      return `pendiente (${trigger.reason})`;
    }

    if ("status" in trigger) {
      return `error (${trigger.status})`;
    }

    return "error";
  }

  const projectName = trigger.project?.name || trigger.project?.slug || "sin proyecto";
  const envName = trigger.environment.slug || trigger.environment.id || "sin entorno";
  return `OK (${projectName} / ${envName}, status ${trigger.status})`;
}

function formatSupabaseSummary(value: unknown) {
  if (!value || typeof value !== "object") {
    return "sin datos";
  }

  const payload = value as Record<string, unknown>;
  if (payload.error) {
    return "pendiente (faltan credenciales o tabla)";
  }

  return "OK";
}

export async function runDailyAutomationCycle(source = "daily") {
  const trigger: TriggerHealthcheckResult = await runTriggerHealthcheck().catch(
    (error) => ({ ok: false as const, status: 500, error: String(error) }),
  );
  const supabase = await recordSupabaseHeartbeat(source).catch((error) => ({ error: String(error) }));

  const lines = [
    `Fuente: ${source}`,
    `Fecha: ${new Date().toISOString()}`,
    `Trigger.dev: ${formatTriggerSummary(trigger)}`,
    `Supabase: ${formatSupabaseSummary(supabase)}`,
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
