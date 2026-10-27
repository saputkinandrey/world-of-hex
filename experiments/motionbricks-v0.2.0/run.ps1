param(
    [ValidateSet('diagnose', 'lfs', 'install', 'once', 'loop', 'verify', 'benchmark', 'fp16', 'inbetweener', 'scene', 'visual-inbetweener', 'visual-scene', 'cold', 'audit', 'warm-loads', 'summary')]
    [string]$Action = 'diagnose'
)
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json -AsHashtable
$localConfig = Join-Path $PSScriptRoot 'config.local.json'
if (Test-Path -LiteralPath $localConfig) {
    $overrides = Get-Content -LiteralPath $localConfig -Raw | ConvertFrom-Json -AsHashtable
    foreach ($key in $overrides.Keys) { $config[$key] = $overrides[$key] }
}
$runtime = [IO.Path]::GetFullPath($config.runtime_root)
$models = [IO.Path]::GetFullPath($config.model_root)
if ($runtime -match '[^\x00-\x7F]' -or $models -match '[^\x00-\x7F]') { throw 'Warp/TensorRT runtime and model paths must be ASCII; configure config.local.json' }
$repo = Join-Path $runtime 'motionbricks'
$uv = Join-Path $runtime 'tools/uv.exe'
if (-not (Test-Path -LiteralPath $uv)) { throw "Missing local uv: $uv; see README.md" }
if (-not (Test-Path -LiteralPath (Join-Path $repo 'pyproject.toml'))) { throw "Missing MotionBricks checkout: $repo; see README.md" }
$revision = & git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $revision.Trim() -ne $config.upstream_commit) { throw "MotionBricks checkout must match $($config.upstream_commit)" }
$soma = Join-Path $models 'soma'
$plans = Join-Path $models 'plans'
foreach ($link in @(@{path=(Join-Path $repo 'motionbricks/assets/onnx/soma'); target=$soma}, @{path=(Join-Path $repo '.trt-cache'); target=$plans})) {
    $item = Get-Item -LiteralPath $link.path
    if ($item.LinkType -ne 'Junction' -or [IO.Path]::GetFullPath([string]$item.Target) -ne [IO.Path]::GetFullPath($link.target)) {
        throw "Expected junction $($link.path) -> $($link.target); see README.md"
    }
}
$env:UV_CACHE_DIR = Join-Path $runtime 'cache/uv'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $runtime 'python'
$env:UV_PYTHON_BIN_DIR = Join-Path $runtime 'tools'
$env:UV_PYTHON_INSTALL_BIN = 'false'
$env:PYTHONUTF8 = '1'
$env:PYTHONUNBUFFERED = '1'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:WARP_CACHE_PATH = Join-Path $runtime 'cache/warp'
$run = Join-Path $PSScriptRoot ('runs/' + [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ') + '-' + $Action)
New-Item -ItemType Directory -Path (Join-Path $run 'logs'), (Join-Path $run 'results') -Force | Out-Null
$env:MOTIONBRICKS_OUTPUT_ROOT = $run
Write-Output "Run artifacts: $run"
$timer = [Diagnostics.Stopwatch]::StartNew()
$gpuWatcher = $null
Push-Location -LiteralPath $repo
try {
    if ($Action -in @('once', 'loop', 'verify', 'benchmark', 'fp16', 'cold')) {
        $gpuWatcher = Start-Process -FilePath (Get-Command nvidia-smi).Source -ArgumentList @('--query-gpu=timestamp,memory.used,memory.total,utilization.gpu', '--format=csv,noheader', '-lms', '500') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run "logs/$Action-gpu.csv") -RedirectStandardError (Join-Path $run "logs/$Action-gpu-stderr.log")
    }
    switch ($Action) {
        'diagnose' {
            & $uv --version
            if ($LASTEXITCODE -ne 0) { throw 'uv version check failed' }
            & $uv run --locked python --version
            if ($LASTEXITCODE -ne 0) { throw 'Python version check failed' }
            nvidia-smi
            if ($LASTEXITCODE -ne 0) { throw 'GPU inspection failed' }
            Write-Output "Upstream: $revision"
            Write-Output "Runtime: $runtime"
            Write-Output "Models and plans: $models"
            return
        }
        'lfs' { git lfs pull --include='assets/motions/soma/**,motionbricks/assets/onnx/soma/**,motionbricks/assets/human/**' }
        'install' { & $uv sync --locked }
        'once' { & $uv run --locked python docs/examples/generate_once.py }
        'loop' { & $uv run --locked python docs/examples/locomotion_loop.py }
        'inbetweener' { & $uv run --locked python -m app.inbetweener_demo }
        'scene' { & $uv run --locked python -m app.scene_preview --scene assets/scenes/soma_gym.scene.json }
        { $_ -in @('verify', 'benchmark', 'fp16') } { & $uv run --locked python (Join-Path $PSScriptRoot 'probe.py') $Action }
        { $_ -in @('visual-inbetweener', 'visual-scene') } { & $uv run --locked python (Join-Path $PSScriptRoot 'render_probe.py') $Action }
        'cold' { & $uv run --locked python (Join-Path $PSScriptRoot 'cold_plan.py') }
        'audit' { & $uv run --locked python (Join-Path $PSScriptRoot 'audit_outputs.py') }
        'warm-loads' { & $uv run --locked python (Join-Path $PSScriptRoot 'warm_loads.py') }
        'summary' { & $uv run --locked python (Join-Path $PSScriptRoot 'summarize.py') }
    }
    if ($LASTEXITCODE -ne 0) { throw "MotionBricks action '$Action' failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
    $timer.Stop()
    if ($gpuWatcher -and -not $gpuWatcher.HasExited) { Stop-Process -Id $gpuWatcher.Id }
    [pscustomobject]@{action=$Action;wall_seconds=$timer.Elapsed.TotalSeconds;ended_utc=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run "results/$Action-process-timing.json") -Encoding utf8
}
