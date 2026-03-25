import { env } from "../src/config/env.js";
import { getGoogleAccessToken } from "../google/google-oauth.service.js";

export type CalendarAgendaEvent = {
  id: string;
  summary: string;
  start: string;
  end?: string;
  allDay: boolean;
  htmlLink?: string;
};

function getOffsetString(timeZone: string, date = new Date()) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")
    ?.value;

  const normalized = part?.replace("GMT", "") || "+00";
  if (normalized === "" || normalized === "0") {
    return "+00:00";
  }

  const sign = normalized.startsWith("-") ? "-" : "+";
  const raw = normalized.replace(/[+-]/, "");
  const [hours, minutes = "00"] = raw.includes(":") ? raw.split(":") : [raw, "00"];
  return `${sign}${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function getLocalDateString(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((item) => item.type === "year")?.value ?? "0000";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function buildDayWindow(timeZone: string) {
  const today = getLocalDateString(timeZone);
  const offset = getOffsetString(timeZone);
  return {
    timeMin: `${today}T00:00:00${offset}`,
    timeMax: `${today}T23:59:59${offset}`,
  };
}

function toAgendaEvent(item: Record<string, unknown>): CalendarAgendaEvent {
  const startValue = item.start as Record<string, string> | undefined;
  const endValue = item.end as Record<string, string> | undefined;
  const summary = typeof item.summary === "string" && item.summary.trim() ? item.summary : "Sin título";
  const start = startValue?.dateTime ?? startValue?.date ?? "Sin hora";
  const end = endValue?.dateTime ?? endValue?.date;

  return {
    id: String(item.id ?? summary),
    summary,
    start,
    end,
    allDay: Boolean(startValue?.date && !startValue?.dateTime),
    htmlLink: typeof item.htmlLink === "string" ? item.htmlLink : undefined,
  };
}

function formatEventTime(event: CalendarAgendaEvent, timeZone: string) {
  if (event.allDay) {
    return "Todo el día";
  }

  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) {
    return event.start;
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(start);
}

export async function getTodayCalendarAgenda(maxResults = 10) {
  const accessToken = await getGoogleAccessToken();
  const { timeMin, timeMax } = buildDayWindow(env.GOOGLE_TIMEZONE);
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: env.GOOGLE_TIMEZONE,
    timeMin,
    timeMax,
    maxResults: String(maxResults),
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = (await response.json()) as { items?: Array<Record<string, unknown>>; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Calendar devolvió ${response.status}`);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    ok: true as const,
    timeZone: env.GOOGLE_TIMEZONE,
    total: items.length,
    events: items.map(toAgendaEvent),
  };
}

export function formatAgendaTelegramMessage(
  agenda:
    | { ok: true; timeZone: string; total: number; events: CalendarAgendaEvent[] }
    | { ok: false; error: string },
) {
  if (!agenda.ok) {
    return `<b>Agenda de hoy</b>\nNo se pudo leer Google Calendar.\n${agenda.error}`;
  }

  if (agenda.events.length === 0) {
    return "<b>Agenda de hoy</b>\nNo tienes eventos para hoy.";
  }

  const lines = ["<b>Agenda de hoy</b>"];
  for (const [index, event] of agenda.events.entries()) {
    lines.push(
      `${index + 1}. ${formatEventTime(event, agenda.timeZone)} — ${event.summary}`,
    );
  }
  return lines.join("\n");
}
