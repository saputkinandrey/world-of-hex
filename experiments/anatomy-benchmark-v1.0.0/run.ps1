param(
    [ValidateSet('setup','setup-sapiens','setup-densepose','prepare','download','download-bodypix','schp','bodypix','sapiens2','seethrough-sam','densepose','compare','verify')][string]$Action='prepare',
    [string]$UvExecutable='D:/gamedev/decision-tooling/uv.exe'
)
$ErrorActionPreference='Stop'
$env:PYTHONUTF8='1'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:UV_CACHE_DIR=Join-Path $PSScriptRoot 'cache/uv'
$env:UV_LINK_MODE='copy'
$python=Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if ($Action -in @('densepose','setup-densepose')) {
    $script=if ($Action -eq 'densepose') { 'densepose-run.sh' } else { 'densepose-check.sh' }
    $linuxScript='/mnt/'+$PSScriptRoot.Substring(0,1).ToLower()+$PSScriptRoot.Substring(2).Replace('\','/')+'/'+$script
    & wsl -d Ubuntu -- bash $linuxScript
    if ($LASTEXITCODE -ne 0) { throw 'DensePose inference failed; see metadata and log' }
    return
}
if ($Action -eq 'setup-sapiens') {
    $gpuPython=Join-Path $PSScriptRoot '.venv-sapiens/Scripts/python.exe'
    if (-not (Test-Path $gpuPython)) {
        & $UvExecutable venv --python 3.12.9 (Join-Path $PSScriptRoot '.venv-sapiens')
        if ($LASTEXITCODE -ne 0) { throw 'Sapiens venv creation failed' }
    }
    & $UvExecutable pip install --python $gpuPython -r (Join-Path $PSScriptRoot 'requirements-sapiens-lock.txt') --extra-index-url https://download.pytorch.org/whl/cu128 --index-strategy unsafe-best-match
    if ($LASTEXITCODE -ne 0) { throw 'Sapiens dependencies failed' }
    return
}
if ($Action -eq 'setup') {
    if (-not (Test-Path $python)) {
        & $UvExecutable venv --python 3.12.9 (Join-Path $PSScriptRoot '.venv')
        if ($LASTEXITCODE -ne 0) { throw 'CPU venv creation failed' }
    }
    $lock=Join-Path $PSScriptRoot 'requirements-lock.txt'
    $requirements=if (Test-Path $lock) { $lock } else { Join-Path $PSScriptRoot 'requirements.txt' }
    & $UvExecutable pip install --python $python -r $requirements
    if ($LASTEXITCODE -ne 0) { throw 'CPU dependencies failed' }
    & $UvExecutable pip freeze --python $python | Set-Content $lock -Encoding utf8
    Push-Location $PSScriptRoot
    try {
        & npm.cmd install --cache (Join-Path $PSScriptRoot 'cache/npm') --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Node dependencies failed' }
    } finally { Pop-Location }
    return
}
if ($Action -eq 'seethrough-sam') {
    $python='C:/Users/Андрей/Desktop/hex-animation-tooling/see-through-windows/see-through/.venv/Scripts/python.exe'
}
if ($Action -eq 'sapiens2') { $python=Join-Path $PSScriptRoot '.venv-sapiens/Scripts/python.exe' }
if ($Action -eq 'download-bodypix') {
    & node (Join-Path $PSScriptRoot 'bodypix.cjs') --download
    if ($LASTEXITCODE -ne 0) { throw 'BodyPix download failed' }
    return
}
& $python (Join-Path $PSScriptRoot 'bench.py') $Action
if ($LASTEXITCODE -ne 0) { throw "Benchmark $Action failed: $LASTEXITCODE" }
