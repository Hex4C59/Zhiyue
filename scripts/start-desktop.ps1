param(
    [string] $Library,
    [string] $Python
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$applicationRoot = Join-Path $projectRoot 'app'
$desktopExecutable = Join-Path $applicationRoot 'desktop\src-tauri\target\release\zhiyue-desktop.exe'
if (-not (Test-Path -LiteralPath $desktopExecutable)) {
    throw '桌面程序尚未构建，请先在项目根目录运行 npm run desktop:build。'
}
if (-not $Library) { $Library = Join-Path $projectRoot 'library' }
if (-not (Test-Path -LiteralPath $Library)) {
    throw "文献库不存在：$Library"
}
if (-not $Python) {
    $candidate = Join-Path $applicationRoot 'downloader\.venv\Scripts\python.exe'
    if (Test-Path -LiteralPath $candidate) { $Python = $candidate }
}
$env:LITERATURE_LIBRARY = (Resolve-Path -LiteralPath $Library).Path
if ($Python) {
    if (-not (Test-Path -LiteralPath $Python)) { throw "Python 不存在：$Python" }
    $env:LITERATURE_PYTHON = (Resolve-Path -LiteralPath $Python).Path
} else {
    Write-Warning '未找到项目 Python 虚拟环境，PDF 导入与下载将使用系统 Python。'
}
Start-Process -FilePath $desktopExecutable
