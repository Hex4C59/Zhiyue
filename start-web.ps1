param(
    [ValidateRange(1024,65535)] [int] $Port = 8765,
    [switch] $NoBrowser
)
# 根目录入口转发到 app/scripts，统一由后者解析路径与启动参数。
& (Join-Path $PSScriptRoot 'app\scripts\start-web.ps1') @PSBoundParameters
exit $LASTEXITCODE
