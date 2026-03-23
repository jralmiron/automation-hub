$vault = "D:\secretos\scripts\Get-Secret.ps1"

function Set-SecretEnv($name, $envName) {
  $value = powershell -ExecutionPolicy Bypass -File $vault -Name $name
  if ($LASTEXITCODE -eq 0 -and $value) {
    [Environment]::SetEnvironmentVariable($envName, $value, "Process")
    Write-Host "Cargado $envName"
  } else {
    Write-Host "No disponible $name"
  }
}

Set-SecretEnv "telegram_bot" "TELEGRAM_BOT_TOKEN"
Set-SecretEnv "telegram_chat_id" "TELEGRAM_CHAT_ID"
Set-SecretEnv "trigger_dev" "TRIGGER_API_KEY"
Set-SecretEnv "deepseek_api" "DEEPSEEK_API_KEY"
