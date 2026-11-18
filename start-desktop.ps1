param(
    [string] $Library,
    [string] $Python
)
# 根目录入口转发到 scripts，统一由后者解析路径与启动参数。
& (Join-Path $PSScriptRoot 'scripts\start-desktop.ps1') @PSBoundParameters
exit $LASTEXITCODE
