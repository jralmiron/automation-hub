param(
  [string]$OutputPath = ".env"
)

$ErrorActionPreference = "Stop"
$vaultScript = "D:\secretos\scripts\Get-Secret.ps1"

function Read-Vault([string]$name) {
  powershell -ExecutionPolicy Bypass -File $vaultScript -Name $name
}

function New-WebhookSecret() {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes).Replace("+", "").Replace("/", "").Replace("=", "")
}

$webhookSecret = New-WebhookSecret

$lines = @(
  "APP_PORT=3000",
  "APP_BASE_URL=http://127.0.0.1:3000",
  "TELEGRAM_BOT_TOKEN=$(Read-Vault 'telegram_bot')",
  "TELEGRAM_CHAT_ID=$(Read-Vault 'telegram_chat_id')",
  "TELEGRAM_ALLOWED_CHAT_IDS=$(Read-Vault 'telegram_chat_id')",
  "TELEGRAM_WEBHOOK_SECRET=$webhookSecret",
  "DEEPSEEK_API_KEY=$(Read-Vault 'deepseek_api')",
  "DEEPSEEK_MODEL=deepseek-chat",
  "DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions",
  "TRIGGER_API_KEY=$(Read-Vault 'trigger_dev')",
  "TRIGGER_API_URL=https://api.trigger.dev",
  "SUPABASE_URL=$(Read-Vault 'supabase_main_url')",
  "SUPABASE_DB_URL=$(Read-Vault 'supabase_main_pooler_url')",
  "SUPABASE_SCHEMA=public",
  "GMAIL_SUMMARY_TO=$(Read-Vault 'gmail_summary_to')",
  "GITHUB_OWNER=jralmiron",
  "GITHUB_REPO=automation-hub",
  "GITHUB_TOKEN=$(Read-Vault 'github_token')",
  "GITHUB_WORKFLOW_FILE=manual-job.yml",
  "GITHUB_REF=main"
)

Set-Content -Path $OutputPath -Value ($lines -join "`r`n") -Encoding UTF8
Write-Host "Archivo generado: $OutputPath"
