import { z } from "zod";

export const allowedJobs = [
  "daily",
  "trigger",
  "supabase",
  "telegram",
  "gmail_inbox",
  "calendar_agenda",
  "gmail_organize",
  "morning_routine",
  "urgent_emails",
  "tomorrow_meetings",
  "purchase_tracking",
  "financial_summary",
  "newsletter_cleanup",
  "followup_24h",
  "followup_48h",
  "night_digest",
  "briefing",
  "focus_mode",
] as const;
export type AllowedJob = (typeof allowedJobs)[number];

export const supportedIntents = ["run_manual_job", "status", "help", "unknown"] as const;
export type SupportedIntent = (typeof supportedIntents)[number];

export const commandIntentSchema = z.object({
  intent: z.enum(supportedIntents),
  job: z.enum(allowedJobs).optional(),
  text: z.string().max(500).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  reason: z.string().max(500).optional(),
});

export type CommandIntent = z.infer<typeof commandIntentSchema>;

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getHelpMessage() {
  return [
    "<b>Comandos disponibles</b>",
    "",
    "• /daily -> lanza el ciclo diario",
    "• /trigger -> ejecuta healthcheck de Trigger.dev",
    "• /supabase -> registra heartbeat en Supabase",
    "• /inbox -> te devuelve los 5 primeros correos de la bandeja de entrada",
    "• /agenda -> te muestra la agenda de hoy en Google Calendar",
    "• /organize -> organiza el email por categorías seguras",
    "• /morning -> ejecuta la rutina diaria de las 09:00",
    "• /urgent -> correos urgentes",
    "• /tomorrow -> reuniones de mañana",
    "• /shopping -> seguimiento de compras",
    "• /finance -> resumen financiero",
    "• /newsletter -> limpieza de newsletters",
    "• /followup24 -> tareas sin responder 24h",
    "• /followup48 -> tareas sin responder 48h",
    "• /night -> digest nocturno",
    "• /briefing -> agenda + clima + trayecto",
    "• /focus -> modo foco",
    "• /status -> muestra estado del bridge y último workflow",
    "• /telegram texto -> envía un texto manual por el canal Telegram del automation-hub",
    "",
    "También puedes escribir en lenguaje natural, por ejemplo:",
    "• ejecuta el flujo diario",
    "• corre trigger",
    "• qué correos tengo",
    "• cuál es mi agenda de hoy",
    "• organiza mi correo",
    "• muéstrame los correos urgentes",
    "• qué reuniones tengo mañana",
    "• resumen financiero",
    "• activa modo foco",
    "• quiero el estado",
  ].join("\n");
}

export function parseDirectCommand(rawText: string): CommandIntent | null {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();

  if (!lower.startsWith("/")) {
    return null;
  }

  if (lower === "/help" || lower === "/start") {
    return { intent: "help", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/status") {
    return { intent: "status", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/daily") {
    return { intent: "run_manual_job", job: "daily", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/trigger") {
    return { intent: "run_manual_job", job: "trigger", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/supabase") {
    return { intent: "run_manual_job", job: "supabase", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/inbox" || lower === "/correo" || lower === "/correos") {
    return { intent: "run_manual_job", job: "gmail_inbox", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/agenda" || lower === "/calendar") {
    return { intent: "run_manual_job", job: "calendar_agenda", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/organize" || lower === "/organizar") {
    return { intent: "run_manual_job", job: "gmail_organize", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/morning" || lower === "/rutina") {
    return { intent: "run_manual_job", job: "morning_routine", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/urgent") {
    return { intent: "run_manual_job", job: "urgent_emails", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/tomorrow") {
    return { intent: "run_manual_job", job: "tomorrow_meetings", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/shopping") {
    return { intent: "run_manual_job", job: "purchase_tracking", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/finance") {
    return { intent: "run_manual_job", job: "financial_summary", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/newsletter") {
    return { intent: "run_manual_job", job: "newsletter_cleanup", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/followup24") {
    return { intent: "run_manual_job", job: "followup_24h", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/followup48") {
    return { intent: "run_manual_job", job: "followup_48h", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/night") {
    return { intent: "run_manual_job", job: "night_digest", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/briefing") {
    return { intent: "run_manual_job", job: "briefing", confidence: "high", reason: "slash-command" };
  }

  if (lower === "/focus") {
    return { intent: "run_manual_job", job: "focus_mode", confidence: "high", reason: "slash-command" };
  }

  if (lower.startsWith("/telegram")) {
    const manualText = text.slice("/telegram".length).trim();
    return {
      intent: "run_manual_job",
      job: "telegram",
      text: manualText || "Mensaje manual desde Telegram bridge",
      confidence: "high",
      reason: "slash-command",
    };
  }

  return { intent: "unknown", confidence: "high", reason: "unsupported-slash-command" };
}
