# automation-hub

Hub de automatizaciones pensado para ejecutarse en GitHub Actions y apoyarse en Trigger.dev.

## Estructura

- `gmail/` resumen y piezas para correo
- `telegram/` envío de mensajes a Telegram
- `api/` endpoints serverless para Vercel
- `src/telegram-bridge/` puente Telegram -> DeepSeek -> GitHub Actions
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
npm run job:morning
npm run bridge:test
```

## Telegram en lenguaje natural

Este repo incluye un puente para:

1. recibir mensajes de Telegram,
2. interpretar lenguaje natural con DeepSeek,
3. mapear la intención a una acción permitida,
4. disparar `manual-job.yml` en GitHub Actions.

Comandos/acciones permitidas:

- `daily`
- `trigger`
- `supabase`
- `telegram`
- `gmail_inbox`
- `calendar_agenda`
- `gmail_organize`
- `morning_routine`
- `status`
- `help`

El modelo **no ejecuta shell libre**. Solo produce una intención validada contra whitelist.

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
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_TIMEZONE`

Hay un asistente preparado en `scripts/set-github-secrets.ps1` y el mapa en `scripts/github-secrets.template.json`.

## Variables de entorno del bridge

- `TELEGRAM_ALLOWED_CHAT_IDS` lista separada por comas; si falta, usa `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET` secreto del webhook de Telegram
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` (por defecto `deepseek-chat`)
- `DEEPSEEK_API_URL` (por defecto `https://api.deepseek.com/chat/completions`)
- `GITHUB_TOKEN` token con permisos para lanzar workflows
- `GITHUB_OWNER` / `GITHUB_REPO` o `GITHUB_REPOSITORY`
- `GITHUB_WORKFLOW_FILE` (por defecto `manual-job.yml`)
- `GITHUB_REF` (por defecto `main`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (por defecto `primary`)
- `GOOGLE_TIMEZONE` (por defecto `Europe/Madrid`)

## Endpoints locales / Vercel

- `GET /health`
- `GET /telegram/health` (local)
- `POST /telegram/webhook` (local)
- `GET /api/health` (Vercel)
- `POST /api/telegram/webhook` (Vercel)

## Despliegue recomendado

- Vercel para el webhook Telegram
- GitHub Actions para la ejecución remota
- Telegram para entrada/salida
- DeepSeek solo para comprensión del lenguaje natural

## Workflows incluidos

- `ci.yml` valida TypeScript y build
- `daily-jobs.yml` ejecuta el ciclo diario por cron o manualmente
- `manual-job.yml` permite lanzar un job concreto con inputs
- `event-job.yml` responde a `push` y `repository_dispatch`
- `morning-routine.yml` recuerda la agenda y organiza Gmail a las 09:00 hora Madrid

## Flujos personales añadidos

- Consulta de los 5 primeros correos desde Telegram
- Consulta de la agenda de hoy desde Telegram
- Organización segura del correo por categorías/etiquetas
- Rutina diaria de las 09:00 con agenda + organización de email

## Trigger.dev

El proyecto ya usa Trigger.dev como servicio externo de referencia para healthchecks y como siguiente motor natural para flujos más complejos.

## Supabase

La base principal usa el pooler y ya tiene preparada la tabla `public.automation_heartbeats`.

## Recomendación de despliegue

- GitHub Actions para jobs gratis por horario, manuales y por evento
- Trigger.dev para procesos más ricos, largos o con más observabilidad
- secretos en GitHub Secrets, no en el repo
