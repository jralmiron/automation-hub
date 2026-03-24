import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:3000"),
  INNGEST_APP_ID: z.string().default("automation-hub"),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TRIGGER_API_KEY: z.string().optional(),
  TRIGGER_API_URL: z.string().url().default("https://api.trigger.dev"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  SUPABASE_SCHEMA: z.string().default("public"),
  GMAIL_SUMMARY_TO: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
