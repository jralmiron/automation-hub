param(
  [string]$ProductionUrl = "https://automation-5uq6mercg-juan-ramons-projects-f12d5c92.vercel.app"
)

$ErrorActionPreference = "Stop"
$vault = "D:\secretos\scripts\Get-Secret.ps1"

function Secret([string]$name) {
  powershell -ExecutionPolicy Bypass -File $vault -Name $name
}

function Add-VercelEnv([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "Skip $name (empty)"
    return
  }

  $value | npx vercel env add $name production | Out-Null
  Write-Host "Added $name"
}

$webhook = (
  (Get-Content (Join-Path $PSScriptRoot "..\.env")) |
    Where-Object { $_ -match "^TELEGRAM_WEBHOOK_SECRET=" }
) -replace "^TELEGRAM_WEBHOOK_SECRET=", ""

Add-VercelEnv "APP_BASE_URL" $ProductionUrl
Add-VercelEnv "TELEGRAM_BOT_TOKEN" (Secret "telegram_bot")
Add-VercelEnv "TELEGRAM_CHAT_ID" (Secret "telegram_chat_id")
Add-VercelEnv "TELEGRAM_ALLOWED_CHAT_IDS" (Secret "telegram_chat_id")
Add-VercelEnv "TELEGRAM_WEBHOOK_SECRET" $webhook
Add-VercelEnv "DEEPSEEK_API_KEY" (Secret "deepseek_api")
Add-VercelEnv "DEEPSEEK_MODEL" "deepseek-chat"
Add-VercelEnv "DEEPSEEK_API_URL" "https://api.deepseek.com/chat/completions"
Add-VercelEnv "GITHUB_OWNER" "jralmiron"
Add-VercelEnv "GITHUB_REPO" "automation-hub"
Add-VercelEnv "GITHUB_TOKEN" (Secret "github_token")
Add-VercelEnv "GITHUB_WORKFLOW_FILE" "manual-job.yml"
Add-VercelEnv "GITHUB_REF" "main"
Add-VercelEnv "TRIGGER_API_KEY" (Secret "trigger_dev")
Add-VercelEnv "TRIGGER_API_URL" "https://api.trigger.dev"
Add-VercelEnv "SUPABASE_URL" (Secret "supabase_main_url")
Add-VercelEnv "SUPABASE_DB_URL" (Secret "supabase_main_pooler_url")
Add-VercelEnv "SUPABASE_SCHEMA" "public"
Add-VercelEnv "GMAIL_SUMMARY_TO" (Secret "gmail_summary_to")
