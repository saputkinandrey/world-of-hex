param(
    [ValidateSet('run','test','acceptance')][string]$Action='run',
    [string]$Workspace
)
$ErrorActionPreference='Stop'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:PYTHONUTF8='1'
$python=Join-Path $PSScriptRoot '../anatomy-benchmark-v1.0.0/.venv/Scripts/python.exe'
if ($Action -eq 'test') {
    & $python -m unittest discover -s (Join-Path $PSScriptRoot 'tests') -p 'test_*.py'
} elseif ($Action -eq 'acceptance') {
    & $python (Join-Path $PSScriptRoot 'acceptance.py')
} else {
    $arguments=@((Join-Path $PSScriptRoot 'app.py'))
    if ($Workspace) { $arguments+=@('--workspace',$Workspace) }
    & $python @arguments
}
if ($LASTEXITCODE -ne 0) { throw "Mask editor $Action failed with exit $LASTEXITCODE" }
