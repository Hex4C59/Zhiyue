param([Parameter(ValueFromRemainingArguments=$true)][string[]] $LiteratureArguments)
# 兼容已有命令与自动化；下载核心仍位于 tools/download/。
& (Join-Path (Split-Path $PSScriptRoot -Parent) 'app\scripts\download.ps1') @LiteratureArguments
exit $LASTEXITCODE
