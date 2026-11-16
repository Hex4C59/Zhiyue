param(
    [ValidateRange(1024, 65535)] [int] $Port = 8765,
    [switch] $NoBrowser
)
$ErrorActionPreference = 'Stop'
$applicationRoot = Split-Path $PSScriptRoot -Parent
$projectRoot = Join-Path (Split-Path $applicationRoot -Parent) 'library'
$webEntry = Join-Path $applicationRoot 'web\src\server.mjs'
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$nodeVersion = & $nodeExecutable --version
if ([int] ($nodeVersion -replace '^v(\d+).*', '$1') -lt 22) {
    throw '文献网站需要 Node.js 22 或更高版本。'
}
$env:LITERATURE_PORT = [string] $Port
$siteUrl = "http://127.0.0.1:$Port"
Write-Host "Zhiyue：$siteUrl"
Write-Host '保持此窗口运行；按 Ctrl+C 停止网站。'
try {
    $existingSite = Invoke-RestMethod "$siteUrl/api/status" -TimeoutSec 2 -ErrorAction Stop
} catch { $existingSite = $null }
if ($existingSite.root -eq $projectRoot) {
    Write-Host '当前项目的网站已经在运行。'
    if (-not $NoBrowser) { Start-Process $siteUrl }
    exit 0
}
if ($NoBrowser) { & $nodeExecutable $webEntry }
else { & $nodeExecutable $webEntry --open-browser }
exit $LASTEXITCODE
