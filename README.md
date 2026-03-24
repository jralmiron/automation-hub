# automation-hub

Hub de automatizaciones pensado para ejecutarse en GitHub Actions y apoyarse en Trigger.dev.

## Estructura

- `gmail/` resumen y piezas para correo
- `telegram/` envío de mensajes a Telegram
- `trigger/` healthcheck y utilidades para Trigger.dev
- `supabase/` escritura de heartbeat en Supabase
- `jobs/` scripts ejecutables para GitHub Actions
- `.github/workflows/` flujos diarios, manuales, por evento y CI
- `scripts/` bootstrap de secrets e inicialización de base de datos

## Requisitos

- Node.js 18+
- npm 10+
- cuenta de GitHub
- cuenta de Trigger.dev

## Arranque local

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts principales

```bash
npm run check
npm run build
npm run job:daily
npm run job:manual -- telegram "Hola desde GitHub Actions"
npm run job:event
```

## GitHub Secrets recomendados

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TRIGGER_API_KEY`
- `TRIGGER_API_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_SCHEMA`
- `GMAIL_SUMMARY_TO`

Hay un asistente preparado en `scripts/set-github-secrets.ps1` y el mapa en `scripts/github-secrets.template.json`.

## Workflows incluidos

- `ci.yml` valida TypeScript y build
- `daily-jobs.yml` ejecuta el ciclo diario por cron o manualmente
- `manual-job.yml` permite lanzar un job concreto con inputs
- `event-job.yml` responde a `push` y `repository_dispatch`

## Trigger.dev

El proyecto ya usa Trigger.dev como servicio externo de referencia para healthchecks y como siguiente motor natural para flujos más complejos.

## Supabase

La base principal usa el pooler y ya tiene preparada la tabla `public.automation_heartbeats`.

## Recomendación de despliegue

- GitHub Actions para jobs gratis por horario, manuales y por evento
- Trigger.dev para procesos más ricos, largos o con más observabilidad
- secretos en GitHub Secrets, no en el repo
