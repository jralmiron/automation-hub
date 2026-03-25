# Google personal automation setup

Para que funcionen los nuevos flujos de Gmail y Google Calendar en GitHub Actions necesitas estos secrets en GitHub:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN
- GOOGLE_CALENDAR_ID (opcional, por defecto `primary`)
- GOOGLE_TIMEZONE (recomendado `Europe/Madrid`)

## Qué hacen
- `gmail_inbox`: devuelve los 5 primeros correos de la bandeja de entrada
- `calendar_agenda`: devuelve la agenda de hoy
- `gmail_organize`: etiqueta el correo por categorías seguras
- `morning_routine`: a las 09:00 envía agenda + organiza email

## Categorías de email
- Auto/Trabajo
- Auto/Compras
- Auto/Finanzas
- Auto/Newsletters
- Auto/Personal

## Nota
La clasificación es segura: añade o corrige etiquetas, pero no borra correos ni archiva mensajes por defecto.
