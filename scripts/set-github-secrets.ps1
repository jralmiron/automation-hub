param(
  [string]$Repository = "jralmiron/automation-hub"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $PSScriptRoot "github-secrets.template.json"
$vaultScript = "D:\secretos\scripts\Get-Secret.ps1"
$template = Get-Content -Raw $templatePath | ConvertFrom-Json

function Resolve-SecretValue([string]$mapping) {
  if ($mapping.StartsWith("vault:")) {
    $name = $mapping.Substring(6)
    return powershell -ExecutionPolicy Bypass -File $vaultScript -Name $name
  }

  if ($mapping.StartsWith("literal:")) {
    return $mapping.Substring(8)
  }

  return $env:$mapping
}

if (Get-Command gh -ErrorAction SilentlyContinue) {
  foreach ($prop in $template.secrets.PSObject.Properties) {
    $name = $prop.Name
    $value = Resolve-SecretValue([string]$prop.Value)
    if ([string]::IsNullOrWhiteSpace($value) -or $value -eq "env_or_manual") {
      Write-Host "Pendiente: $name"
      continue
    }

    $value | gh secret set $name --repo $Repository
    Write-Host "Secret configurado: $name"
  }
  exit 0
}

if (-not $env:GITHUB_TOKEN) {
  throw "Falta GITHUB_TOKEN y no hay gh autenticado."
}

throw "Implementa esta ruta REST si quieres trabajar solo con GITHUB_TOKEN."
