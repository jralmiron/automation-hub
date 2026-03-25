import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { redactSecrets } from "../lib/redact.js";
import { commandIntentSchema, type CommandIntent } from "./command-intents.js";

const deepseekResponseSchema = {
  type: "json_object",
} as const;

export async function parseIntentWithDeepSeek(text: string): Promise<CommandIntent> {
  if (!env.DEEPSEEK_API_KEY) {
    return {
      intent: "unknown",
      confidence: "low",
      reason: "Falta DEEPSEEK_API_KEY",
    };
  }

  const systemPrompt = [
    "Eres un clasificador de intenciones para un bot de Telegram.",
    "Debes responder SOLO un JSON válido.",
    "Intenciones permitidas: run_manual_job, status, help, unknown.",
    "Jobs permitidos: daily, trigger, supabase, telegram, gmail_inbox, calendar_agenda, gmail_organize, morning_routine.",
    "Si el usuario pide ejecutar daily/trigger/supabase, usa run_manual_job con ese job.",
    "Si pregunta por sus correos, bandeja de entrada o inbox, usa run_manual_job con job gmail_inbox.",
    "Si pregunta por la agenda o calendario de hoy, usa run_manual_job con job calendar_agenda.",
    "Si pide organizar o categorizar el correo, usa run_manual_job con job gmail_organize.",
    "Si pide la rutina de la mañana o de las 9, usa run_manual_job con job morning_routine.",
    "Si quiere mandar un mensaje manual, usa run_manual_job con job telegram y rellena text.",
    "Si pide estado, usa status.",
    "Si pide ayuda, usa help.",
    "Si la petición no es segura o no encaja, usa unknown.",
    "Nunca inventes jobs fuera de la whitelist.",
  ].join(" ");

  const response = await fetch(env.DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL,
      response_format: deepseekResponseSchema,
      temperature: 0,
      max_tokens: 180,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Clasifica este mensaje del usuario y devuelve JSON: ${text}`,
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    logger.error("DeepSeek error", redactSecrets(JSON.stringify(payload)));
    throw new Error(`DeepSeek request failed with status ${response.status}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek returned empty content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    logger.error("DeepSeek JSON parse error", { error, content: redactSecrets(content) });
    throw new Error("DeepSeek returned invalid JSON");
  }

  return commandIntentSchema.parse(parsed);
}
