# Configurar GitHub Secrets

## Estado

Este repo ya tiene preparado el mapeo de secrets en `scripts/github-secrets.template.json`.

## Secretos disponibles ya en `D:\secretos`

- `telegram_bot` -> `TELEGRAM_BOT_TOKEN`
- `telegram_chat_id` -> `TELEGRAM_CHAT_ID`
- `trigger_dev` -> `TRIGGER_API_KEY`

## Valores por defecto ya decididos

- `TRIGGER_API_URL` = `https://api.trigger.dev`
- `SUPABASE_SCHEMA` = `public`

## Aún faltan por aportar

- `SUPABASE_SERVICE_ROLE_KEY` (solo si quieres usar la API de Supabase en vez de conexión Postgres directa)
- `GMAIL_SUMMARY_TO`

## Valores ya preparados para la base principal

- `SUPABASE_URL` <- `vault:supabase_main_url`
- `SUPABASE_DB_URL` <- `vault:supabase_main_pooler_url`
- `SUPABASE_SCHEMA` <- `public`

## Script automático

Usa `scripts/set-github-secrets.ps1` con un `GITHUB_TOKEN` válido o con GitHub CLI (`gh`) autenticado.
