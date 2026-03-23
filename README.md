# automation-hub

Hub de automatizaciones pensado para ejecutarse en GitHub Actions y desarrollarse localmente con Inngest.

## Estructura

- `gmail/` resumen y piezas para correo
- `telegram/` envío de mensajes a Telegram
- `trigger/` healthcheck de Trigger.dev
- `supabase/` escritura de heartbeat en Supabase
- `jobs/` scripts ejecutables para GitHub Actions
- `.github/workflows/` flujos diarios, manuales, por evento y CI
- `src/inngest/` cliente y funciones de Inngest

## Requisitos

- Node.js 18+
- npm 10+
- cuenta de GitHub
- opcional: cuenta de Inngest

## Arranque local

```bash
npm install
cp .env.example .env
npm run dev
```

En otra terminal, levanta Inngest en desarrollo:

```bash
npx inngest-cli@latest dev -u http://127.0.0.1:3000/api/inngest
```

O usando el script preparado:

```bash
npm run inngest:dev
```

## Scripts principales

```bash
npm run check
npm run build
npm run job:daily
npm run job:manual -- telegram "Hola desde GitHub Actions"
npm run job:event
npm run job:seed -- daily "Evento lanzado manualmente"
```

## GitHub Secrets recomendados

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TRIGGER_API_KEY`
- `TRIGGER_API_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCHEMA`
- `GMAIL_SUMMARY_TO`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

Hay un asistente preparado en `scripts/set-github-secrets.ps1` y el mapa en `scripts/github-secrets.template.json`.

## Workflows incluidos

- `ci.yml` valida TypeScript y build
- `daily-jobs.yml` ejecuta el ciclo diario por cron o manualmente
- `manual-job.yml` permite lanzar un job concreto con inputs
- `event-job.yml` responde a `push` y `repository_dispatch`

## Inngest

Funciones incluidas:

- `daily-automation-digest` por cron
- `manual-automation-run` por evento `automation/manual.run`
- `github-push-automation` por evento `automation/github.push`
- `telegram-broadcast` por evento `automation/telegram.send`

## Supabase

Ejecuta antes este SQL:

```sql
-- supabase/schema.sql
create table if not exists public.automation_heartbeats (
  id bigint generated always as identity primary key,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## Recomendación de despliegue

- GitHub Actions para jobs gratis por horario o manuales
- Inngest para orquestación por eventos y cron durables
- secretos en GitHub Secrets, no en el repo
