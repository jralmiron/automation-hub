import { buildDailyEmailSummary } from "../gmail/gmail.jobs.js";
import {
  formatInboxTelegramMessage,
  formatOrganizerTelegramMessage,
  getInboxTopMessages,
  organizeInboxByCategories,
} from "../gmail/gmail.automation.js";
import { recordSupabaseHeartbeat } from "../supabase/supabase.jobs.js";
import { notifyTelegramDailySummary } from "../telegram/telegram.jobs.js";
import { runTriggerHealthcheck } from "../trigger/trigger.jobs.js";
import type { TriggerHealthcheckResult } from "../trigger/trigger.types.js";
import { formatAgendaTelegramMessage, getTodayCalendarAgenda } from "../calendar/calendar.service.js";
import { env } from "../src/config/env.js";

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

  if (job === "gmail_inbox") {
    const inbox = await getInboxTopMessages(5)
      .then((value) => value)
      .catch((error) => ({ ok: false as const, error: String(error) }));
    await notifyTelegramDailySummary([formatInboxTelegramMessage(inbox)]);
    return inbox;
  }

  if (job === "calendar_agenda") {
    const agenda = await getTodayCalendarAgenda(10)
      .then((value) => value)
      .catch((error) => ({ ok: false as const, error: String(error) }));
    await notifyTelegramDailySummary([formatAgendaTelegramMessage(agenda)]);
    return agenda;
  }

  if (job === "gmail_organize") {
    const organized = await organizeInboxByCategories(50)
      .then((value) => value)
      .catch((error) => ({ ok: false as const, error: String(error) }));
    await notifyTelegramDailySummary([formatOrganizerTelegramMessage(organized)]);
    return organized;
  }

  if (job === "morning_routine") {
    return runMorningRoutine("manual");
  }

  return runDailyAutomationCycle("manual-fallback");
}

function getHourInTimezone(timeZone: string, date = new Date()) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")
    ?.value;
  return Number(hour ?? "0");
}

export function shouldRunMorningRoutineNow(date = new Date()) {
  if ((process.env.GITHUB_EVENT_NAME ?? "") !== "schedule") {
    return true;
  }

  return getHourInTimezone(env.GOOGLE_TIMEZONE, date) === 9;
}

export async function runMorningRoutine(source = "scheduled") {
  if (!shouldRunMorningRoutineNow()) {
    return {
      ok: true,
      skipped: true,
      reason: `No son las 09:00 en ${env.GOOGLE_TIMEZONE}`,
      source,
    };
  }

  const agenda = await getTodayCalendarAgenda(10)
    .then((value) => value)
    .catch((error) => ({ ok: false as const, error: String(error) }));
  const organized = await organizeInboxByCategories(50)
    .then((value) => value)
    .catch((error) => ({ ok: false as const, error: String(error) }));

  const lines = [
    "<b>Rutina de las 09:00</b>",
    `Fuente: ${source}`,
    "",
    formatAgendaTelegramMessage(agenda),
    "",
    formatOrganizerTelegramMessage(organized),
  ];

  const telegram = await notifyTelegramDailySummary(lines).catch((error) => ({ ok: false, error: String(error) }));
  return {
    ok: true,
    source,
    agenda,
    organized,
    telegram,
  };
}
