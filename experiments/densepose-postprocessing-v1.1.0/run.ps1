param([ValidateSet('run','test','verify')][string]$Action='test')
$ErrorActionPreference='Stop'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:PYTHONUTF8='1'
$python=Join-Path $PSScriptRoot '../anatomy-benchmark-v1.0.0/.venv/Scripts/python.exe'
if ($Action -eq 'test') {
    & $python -m unittest discover -s $PSScriptRoot -p 'test_*.py'
} elseif ($Action -eq 'verify') {
    & $python (Join-Path $PSScriptRoot 'verify.py')
} else {
    & $python (Join-Path $PSScriptRoot 'main.py')
}
if ($LASTEXITCODE -ne 0) { throw "Postprocessing v1.1.0 $Action failed with exit $LASTEXITCODE" }
