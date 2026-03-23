create table if not exists public.automation_heartbeats (
  id bigint generated always as identity primary key,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_heartbeats_source_created_at_idx
  on public.automation_heartbeats (source, created_at desc);
