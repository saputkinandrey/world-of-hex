param([ValidateSet('inventory','preflight','run','render','verify','resume-test')][string]$Action='inventory')
$ErrorActionPreference='Stop'
$env:PYTHONUTF8='1'
$env:PYTHONDONTWRITEBYTECODE='1'
if ($Action -in @('preflight','run')) {
    $linuxScript='/mnt/'+$PSScriptRoot.Substring(0,1).ToLower()+$PSScriptRoot.Substring(2).Replace('\','/')+'/worker.sh'
    & wsl -d Ubuntu -- bash $linuxScript $Action
} else {
    $python=Join-Path $PSScriptRoot '../anatomy-benchmark-v1.0.0/.venv/Scripts/python.exe'
    & $python (Join-Path $PSScriptRoot 'cli.py') $Action
}
if ($LASTEXITCODE -ne 0) { throw "Full-character $Action failed: $LASTEXITCODE" }
