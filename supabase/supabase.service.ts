import { createClient } from "@supabase/supabase-js";
import { env } from "../src/config/env.js";

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: env.SUPABASE_SCHEMA },
    auth: { persistSession: false },
  });
}

export async function writeAutomationHeartbeat(source: string, payload: Record<string, unknown>) {
  const client = getSupabaseClient();
  return client.from("automation_heartbeats").insert({
    source,
    payload,
    created_at: new Date().toISOString(),
  });
}
