import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:3000"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TRIGGER_API_KEY: z.string().optional(),
  TRIGGER_API_URL: z.string().url().default("https://api.trigger.dev"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  SUPABASE_SCHEMA: z.string().default("public"),
  GMAIL_SUMMARY_TO: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  GOOGLE_TIMEZONE: z.string().default("Europe/Madrid"),
  OPENWEATHER_API_KEY: z.string().optional(),
  AEMET_API_KEY: z.string().optional(),
  VIP_EMAILS: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WORKFLOW_FILE: z.string().default("manual-job.yml"),
  GITHUB_REF: z.string().default("main"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  DEEPSEEK_API_URL: z.string().url().default("https://api.deepseek.com/chat/completions"),
});

const parsedEnv = envSchema.parse(process.env);

export const env = Object.fromEntries(
  Object.entries(parsedEnv).map(([key, value]) => [
    key,
    typeof value === "string" ? value.trim() : value,
  ]),
) as typeof parsedEnv;
