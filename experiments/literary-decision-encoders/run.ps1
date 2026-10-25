param(
    [ValidateSet('setup','download','smoke','diagnose','train','score','test','report','audit','check')][string]$Action='smoke',
    [string]$Model,
    [string]$InputFile='fixtures/short.json',
    [string]$OutputDirectory='runs/local-001',
    [string]$Head,
    [int]$Steps=12,
    [ValidateSet('cpu','cuda')][string]$Device='cuda',
    [string]$UvExecutable='D:/gamedev/decision-tooling/uv.exe'
)
$ErrorActionPreference='Stop'
$python=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$env:PYTHONUTF8='1'
$env:USE_TF='0'
$env:UV_LINK_MODE='copy'
$env:UV_CACHE_DIR=Join-Path $PSScriptRoot 'cache/uv'
if ($Action -eq 'setup') {
    if (-not (Test-Path -LiteralPath $python)) {
        & $UvExecutable venv --python 3.12.9 (Join-Path $PSScriptRoot '.venv')
        if ($LASTEXITCODE -ne 0) { throw 'Isolated venv creation failed' }
    }
    $lock=Join-Path $PSScriptRoot 'requirements-lock.txt'
    $requirements=if (Test-Path -LiteralPath $lock) { $lock } else { Join-Path $PSScriptRoot 'requirements.txt' }
    & $UvExecutable pip install --python $python -r $requirements --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
    & $UvExecutable pip freeze --python $python | Set-Content $lock -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw 'Dependency lock failed' }
    return
}
if ($Action -eq 'test') {
    & $python -m unittest discover -s $PSScriptRoot -p 'test_*.py'
} elseif ($Action -eq 'check') {
    & $UvExecutable pip check --python $python
} elseif ($Action -eq 'audit') {
    & $python (Join-Path $PSScriptRoot 'audit.py')
} else {
    $arguments=@($Action,'--input',$InputFile,'--output',$OutputDirectory,'--device',$Device,'--steps',"$Steps")
    if ($Model) { $arguments+=@('--model',$Model) }
    if ($Head) { $arguments+=@('--head',$Head) }
    & $python (Join-Path $PSScriptRoot 'cli.py') @arguments
}
if ($LASTEXITCODE -ne 0) { throw "Literary encoder $Action failed: $LASTEXITCODE" }
