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

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_SUMMARY_TO`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

## Script automático

Usa `scripts/set-github-secrets.ps1` con un `GITHUB_TOKEN` válido o con GitHub CLI (`gh`) autenticado.
