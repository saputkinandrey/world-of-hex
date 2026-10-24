param(
    [ValidateSet('setup','download','run','smoke','test','summarize')][string]$Action='run',
    [string]$InputFile='fixtures/suite.json',
    [string]$OutputDirectory='runs/comparison-001',
    [ValidateSet('cpu','cuda')][string]$Device='cuda',
    [string[]]$Models,
    [string]$UvExecutable='D:/gamedev/decision-tooling/uv.exe'
)
$ErrorActionPreference='Stop'
$python=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$env:PYTHONUTF8='1'
$env:USE_TF='0'
$env:UV_LINK_MODE='copy'
if ($Action -eq 'setup') {
    if (-not (Test-Path -LiteralPath $UvExecutable)) { throw 'Install uv or pass -UvExecutable with its path.' }
    if (-not (Test-Path -LiteralPath $python)) {
        & $UvExecutable venv --python 3.12 (Join-Path $PSScriptRoot '.venv')
        if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated environment' }
    }
    & $UvExecutable pip install --python $python 'torch==2.8.0' --index-url https://download.pytorch.org/whl/cu128
    if ($LASTEXITCODE -ne 0) { throw 'PyTorch installation failed' }
    $settings=Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
    & $UvExecutable pip install --python $python 'torch==2.8.0' 'transformers==5.20.1' psutil -e (Join-Path $settings.upstream_root 'laya') -e (Join-Path $settings.upstream_root 'verdict')
    if ($LASTEXITCODE -ne 0) { throw 'Official SDK installation failed' }
    & $UvExecutable pip freeze --python $python | Set-Content (Join-Path $PSScriptRoot 'requirements-lock.txt') -Encoding utf8
    return
}
switch ($Action) {
    'download' { & $python (Join-Path $PSScriptRoot 'prepare_models.py') }
    'test' { & $python -m unittest discover -s $PSScriptRoot -p 'test_*.py' }
    default {
        $arguments=@()
        $inputPath=if ([IO.Path]::IsPathRooted($InputFile)) { $InputFile } else { Join-Path $PSScriptRoot $InputFile }
        $outputPath=if ([IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $PSScriptRoot $OutputDirectory }
        if ($Action -eq 'smoke') { $arguments += @('--limit','3','--repeats','1') }
        if ($Models) { $arguments += @('--models')+$Models }
        $commandAction=if ($Action -eq 'summarize') { 'summarize' } else { 'run' }
        & $python (Join-Path $PSScriptRoot 'bench.py') $commandAction --input $inputPath --output $outputPath --device $Device @arguments
    }
}
if ($LASTEXITCODE -ne 0) { throw "Decision bench $Action failed with exit code $LASTEXITCODE" }
