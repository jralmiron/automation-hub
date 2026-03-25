# Telegram Bridge Ready

## Estado
- Bridge desplegado en Vercel
- Telegram configurado con webhook activo
- DeepSeek interpreta lenguaje natural
- GitHub Actions ejecuta los jobs en la nube
- No hace falta tener el portátil encendido para usarlo

## Flujo
Telegram -> Vercel -> DeepSeek -> whitelist de intenciones -> GitHub Actions -> respuesta por Telegram

## Intenciones soportadas
- estado / status
- ayuda / help
- ejecuta daily
- ejecuta trigger
- ejecuta supabase
- ejecuta telegram

## Ejemplos
- "dame el estado del sistema"
- "ejecuta trigger"
- "lanza el flujo diario"
- "/help"

## Seguridad
- solo chats autorizados
- secreto de webhook
- whitelist de acciones
- sin ejecución libre de shell

## Nota operativa
La URL productiva estable está en Vercel bajo el proyecto `automation-hub` y Telegram ya apunta a ella.
