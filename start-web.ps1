param(
    [ValidateRange(1024,65535)] [int] $Port = 8765,
    [switch] $NoBrowser
)
# 保留原来的启动命令，实际实现集中在 scripts/。
& (Join-Path $PSScriptRoot 'app\scripts\start-web.ps1') @PSBoundParameters
exit $LASTEXITCODE
