import { buildDailyEmailSummary } from "../gmail/gmail.jobs.js";
import {
  formatInboxTelegramMessage,
  formatOrganizerTelegramMessage,
  getInboxTopMessages,
  organizeInboxByCategories,
} from "../gmail/gmail.automation.js";
import {
  cleanupNewsletters,
  formatFinancialTelegramMessage,
  formatNewsletterCleanupTelegramMessage,
  formatPurchaseTelegramMessage,
  formatUnansweredTelegramMessage,
  formatUrgentEmailsTelegramMessage,
  getFinancialEmails,
  getPurchaseEmails,
  getUnansweredTaskReminders,
  getUrgentEmails,
} from "../gmail/gmail.insights.js";
import { recordSupabaseHeartbeat } from "../supabase/supabase.jobs.js";
import { notifyTelegramDailySummary } from "../telegram/telegram.jobs.js";
import { runTriggerHealthcheck } from "../trigger/trigger.jobs.js";
import type { TriggerHealthcheckResult } from "../trigger/trigger.types.js";
import {
  formatAgendaTelegramMessage,
  formatKeyRemindersTelegramMessage,
  formatTomorrowAgendaTelegramMessage,
  getKeyReminders,
  getTodayCalendarAgenda,
  getTomorrowCalendarAgenda,
} from "../calendar/calendar.service.js";
import { env } from "../src/config/env.js";
import { formatTrafficTelegramMessage, getTrafficBrief } from "../traffic/traffic.service.js";
import { formatWeatherTelegramMessage, getWeatherBrief } from "../weather/weather.service.js";

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

  if (job === "urgent_emails") {
    const urgent = await getUrgentEmails(5);
    await notifyTelegramDailySummary([formatUrgentEmailsTelegramMessage(urgent)]);
    return urgent;
  }

  if (job === "tomorrow_meetings") {
    return runTomorrowMeetingsSummary("manual");
  }

  if (job === "purchase_tracking") {
    const purchases = await getPurchaseEmails(8);
    await notifyTelegramDailySummary([formatPurchaseTelegramMessage(purchases)]);
    return purchases;
  }

  if (job === "financial_summary") {
    const financial = await getFinancialEmails(8);
    await notifyTelegramDailySummary([formatFinancialTelegramMessage(financial)]);
    return financial;
  }

  if (job === "newsletter_cleanup") {
    const result = await cleanupNewsletters(20);
    await notifyTelegramDailySummary([formatNewsletterCleanupTelegramMessage(result)]);
    return result;
  }

  if (job === "followup_24h") {
    const followups = await getUnansweredTaskReminders(24, 8);
    await notifyTelegramDailySummary([formatUnansweredTelegramMessage(followups)]);
    return followups;
  }

  if (job === "followup_48h") {
    const followups = await getUnansweredTaskReminders(48, 8);
    await notifyTelegramDailySummary([formatUnansweredTelegramMessage(followups)]);
    return followups;
  }

  if (job === "night_digest") {
    return runNightDigest("manual");
  }

  if (job === "briefing") {
    return runMorningBriefing("manual");
  }

  if (job === "focus_mode") {
    return runFocusMode("manual");
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

export async function runMorningBriefing(source = "scheduled") {
  const [agenda, urgent, reminders, weather, traffic] = await Promise.all([
    getTodayCalendarAgenda(10).catch((error) => ({ ok: false as const, error: String(error) })),
    getUrgentEmails(5).catch((error) => ({ ok: false as const, messages: [], error: String(error) })),
    getKeyReminders(5).catch((error) => ({ ok: false as const, error: String(error) })),
    getWeatherBrief().catch((error) => ({
      rincon: { ok: false as const, error: String(error) },
      velez: { ok: false as const, error: String(error) },
      aemet: { ok: false as const, error: String(error) },
    })),
    getTrafficBrief().catch((error) => ({ ok: false as const, error: String(error) })),
  ]);

  const lines = [
    "<b>Resumen matinal completo</b>",
    `Fuente: ${source}`,
    "",
    formatAgendaTelegramMessage(agenda),
    "",
    formatUrgentEmailsTelegramMessage(urgent.ok ? urgent : { ok: true as const, messages: [] }),
    "",
    formatKeyRemindersTelegramMessage(reminders),
    "",
    formatWeatherTelegramMessage(weather),
    "",
    formatTrafficTelegramMessage(traffic),
  ];

  const telegram = await notifyTelegramDailySummary(lines);
  return { ok: true, source, agenda, urgent, reminders, weather, traffic, telegram };
}

export async function runTomorrowMeetingsSummary(source = "scheduled") {
  const tomorrow = await getTomorrowCalendarAgenda(10)
    .then((value) => value)
    .catch((error) => ({ ok: false as const, error: String(error) }));
  const telegram = await notifyTelegramDailySummary([
    `<b>Resumen de reuniones del día siguiente</b>\nFuente: ${source}\n\n${formatTomorrowAgendaTelegramMessage(tomorrow)}`,
  ]);
  return { ok: true, source, tomorrow, telegram };
}

export async function runNightDigest(source = "scheduled") {
  const [urgent, tomorrow, purchases, financial, followups] = await Promise.all([
    getUrgentEmails(5),
    getTomorrowCalendarAgenda(10).catch((error) => ({ ok: false as const, error: String(error) })),
    getPurchaseEmails(5),
    getFinancialEmails(5),
    getUnansweredTaskReminders(48, 5),
  ]);

  const lines = [
    "<b>Digest nocturno</b>",
    `Fuente: ${source}`,
    "",
    "<b>Qué llegó hoy</b>",
    formatUrgentEmailsTelegramMessage(urgent),
    "",
    formatPurchaseTelegramMessage(purchases),
    "",
    formatFinancialTelegramMessage(financial),
    "",
    formatUnansweredTelegramMessage(followups),
    "",
    "<b>Qué queda para mañana</b>",
    formatTomorrowAgendaTelegramMessage(tomorrow),
  ];

  const telegram = await notifyTelegramDailySummary(lines);
  return { ok: true, source, urgent, tomorrow, purchases, financial, followups, telegram };
}

export async function runFocusMode(source = "manual") {
  const [urgent, reminders] = await Promise.all([
    getUrgentEmails(3),
    getKeyReminders(3).catch((error) => ({ ok: false as const, error: String(error) })),
  ]);

  const lines = [
    "<b>Modo foco</b>",
    `Fuente: ${source}`,
    "",
    "Solo lo importante:",
    formatUrgentEmailsTelegramMessage(urgent),
    "",
    formatKeyRemindersTelegramMessage(reminders),
  ];

  const telegram = await notifyTelegramDailySummary(lines);
  return { ok: true, source, urgent, reminders, telegram };
}
