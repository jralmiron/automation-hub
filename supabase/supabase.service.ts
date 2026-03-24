import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import dns from "node:dns";
import { env } from "../src/config/env.js";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: env.SUPABASE_SCHEMA },
    auth: { persistSession: false },
  });
}

async function writeHeartbeatViaPostgres(source: string, payload: Record<string, unknown>) {
  if (!env.SUPABASE_DB_URL) {
    throw new Error("Falta SUPABASE_DB_URL");
  }

  const client = new Client({
    connectionString: env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    family: 4,
  } as any);
  await client.connect();

  try {
    await client.query(
      `create table if not exists public.automation_heartbeats (
        id bigint generated always as identity primary key,
        source text not null,
        payload jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )`,
    );

    await client.query(
      `create index if not exists automation_heartbeats_source_created_at_idx
         on public.automation_heartbeats (source, created_at desc)`,
    );

    return await client.query(
      `insert into public.automation_heartbeats (source, payload, created_at)
       values ($1, $2::jsonb, $3)
       returning id, source, created_at`,
      [source, JSON.stringify(payload), new Date().toISOString()],
    );
  } finally {
    await client.end();
  }
}

export async function writeAutomationHeartbeat(source: string, payload: Record<string, unknown>) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const client = getSupabaseClient();
    return client.from("automation_heartbeats").insert({
      source,
      payload,
      created_at: new Date().toISOString(),
    });
  }

  return writeHeartbeatViaPostgres(source, payload);
}
