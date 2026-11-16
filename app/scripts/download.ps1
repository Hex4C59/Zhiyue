param(
    [switch] $RunTests,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $LiteratureArguments
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$downloadRoot = Join-Path $projectRoot 'downloader'
$literatureEntry = Join-Path $downloadRoot 'run.py'
$literatureCandidates = @(
    $env:LITERATURE_PYTHON,
    (Join-Path $downloadRoot '.venv\Scripts\python.exe')
) | Where-Object { $_ }
$literaturePython = $literatureCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $literaturePython) {
    $literaturePython = (Get-Command python -ErrorAction Stop).Source
}
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
if ($RunTests) {
    & $literaturePython -m unittest discover -s (Join-Path $downloadRoot 'tests') -v
} elseif (-not $LiteratureArguments -or $LiteratureArguments.Count -eq 0) {
    & $literaturePython $literatureEntry --help
} else {
    & $literaturePython $literatureEntry @LiteratureArguments
}
exit $LASTEXITCODE
