import { Client } from "pg";
import { execFileSync } from "node:child_process";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

function getSecret(name) {
  return execFileSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", "D:\\secretos\\scripts\\Get-Secret.ps1", "-Name", name],
    { encoding: "utf8" },
  ).trim();
}

const client = new Client({
  connectionString: getSecret("supabase_main_pooler_url"),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(`
    create table if not exists public.automation_heartbeats (
      id bigint generated always as identity primary key,
      source text not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);

  await client.query(`
    create index if not exists automation_heartbeats_source_created_at_idx
      on public.automation_heartbeats (source, created_at desc)
  `);

  const result = await client.query(`
    insert into public.automation_heartbeats (source, payload)
    values ($1, $2::jsonb)
    returning id, source, created_at
  `, ["setup-main", JSON.stringify({ setup: true, at: new Date().toISOString() })]);

  console.log(JSON.stringify({ ok: true, inserted: result.rows[0] }, null, 2));
} finally {
  await client.end();
}
