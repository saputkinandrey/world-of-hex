param(
    [ValidateSet('mv-build','mv-replay','mv-test','mv-report','mv-proof','mv-editor','soma-anatomy-checks','soma-anatomy-inspect','soma-anatomy-hypothesis','soma-build','soma-fit','soma-test','soma-report','soma-editor','soma-proof','prepare-a','prepare-b','prepare-d','prepare-e','import','parse','stage-a','stage-b','stage-d','editor','demo','test','proof','diagnostics','export','video')]
    [string]$Action = 'editor'
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$project = Join-Path $repo 'godot'
$python = Join-Path $repo 'experiments/anatomy-benchmark-v1.0.0/.venv/Scripts/python.exe'
if ($Action -in @('mv-build','mv-replay','mv-test','mv-report')) {
    $mvPython = 'C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe'
    if ($Action -in @('mv-build','mv-replay')) { & $mvPython -B (Join-Path $PSScriptRoot 'tools/soma_multiview.py') $Action.Substring(3) }
    elseif ($Action -eq 'mv-report') { & $mvPython -B (Join-Path $PSScriptRoot 'tools/soma_multiview_report.py') }
    else { & $mvPython -B (Join-Path $PSScriptRoot 'tools/soma_multiview_tests.py') }
    if ($LASTEXITCODE -ne 0) { throw 'Multi-view calibration failed; see original error above' }
    return
}
if ($Action -eq 'soma-anatomy-checks') {
    & 'C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe' -B (Join-Path $PSScriptRoot 'tools/soma_anatomy_checks.py')
    if ($LASTEXITCODE -ne 0) { throw 'Anatomical control failed; inspect the actual saved overlay and original error above' }
    return
}
if ($Action -in @('soma-anatomy-inspect','soma-anatomy-hypothesis')) {
    $somaPython = 'C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe'
    $diagnosticAction = if ($Action -eq 'soma-anatomy-inspect') { 'before' } else { 'hypothesis' }
    & $somaPython -B (Join-Path $PSScriptRoot 'tools/soma_anatomy_diagnostics.py') $diagnosticAction
    if ($LASTEXITCODE -ne 0) { throw 'Anatomical diagnosis failed; see original error above' }
    return
}
if ($Action -in @('soma-build','soma-fit','soma-test','soma-report')) {
    $somaPython = 'C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe'
    if ($Action -eq 'soma-test') {
        & $somaPython -B (Join-Path $PSScriptRoot 'tools/soma_tests.py')
    } elseif ($Action -eq 'soma-report') {
        & $somaPython -B (Join-Path $PSScriptRoot 'tools/soma_report.py')
    } else {
        $somaAction = if ($Action -eq 'soma-build') { 'build' } else { 'refit' }
        & $somaPython -B (Join-Path $PSScriptRoot 'tools/soma_build.py') $somaAction
    }
    if ($LASTEXITCODE -ne 0) { throw 'SOMA CPU operation failed; see original error above' }
    return
}
if ($Action -eq 'video') {
    & $python -B (Join-Path $PSScriptRoot 'tools/measure.py')
    if ($LASTEXITCODE -ne 0) { throw 'Frame set verification failed; no video encoded' }
    $ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
    & $ffmpeg -hide_banner -loglevel warning -n -framerate 30 -i (Join-Path $PSScriptRoot 'exports/comparison/frame-%04d.png') -frames:v 180 -vf 'scale=iw*4:ih*4:flags=neighbor,format=yuv420p' -c:v libx264 -crf 17 (Join-Path $PSScriptRoot 'exports/comparison/demo.mp4')
    if ($LASTEXITCODE -ne 0) { throw 'FFmpeg video encoding failed' }
    return
}
if ($Action.StartsWith('prepare-')) {
    & $python -B (Join-Path $PSScriptRoot 'tools/prepare.py') --stage $Action.Substring(8).ToUpper()
    if ($LASTEXITCODE -ne 0) { throw 'Asset preparation failed' }
    & $python -B (Join-Path $PSScriptRoot 'tools/scene.py')
    if ($LASTEXITCODE -ne 0) { throw 'Scene generation failed' }
    return
}
$engine = if ($env:GODOT_BIN) { $env:GODOT_BIN } else { Join-Path $repo '_tools/godot-workbench/godot.exe' }
$log = Join-Path $PSScriptRoot ($Action + '-engine.log')
$engineArgs = @('--path', ('"'+$project+'"'), '--log-file', ('"'+$log+'"'), '--rendering-method', 'gl_compatibility', '--windowed', '--resolution', '1440x940')
if ($Action -eq 'parse') { $engineArgs += @('--headless','--check-only','--script','res://modules/character-rigging-editor/editor.gd') }
elseif ($Action -eq 'import') { $engineArgs += @('--headless','--editor','--import'); }
else {
    $engineArgs += 'res://modules/character-rigging-editor/editor.tscn'
    if ($Action -eq 'mv-editor') { $engineArgs += @('--','--mv-open') }
    elseif ($Action -eq 'soma-editor') { $engineArgs += @('--','--soma') }
    elseif ($Action -eq 'demo') { $engineArgs += @('--','--demo') }
    elseif ($Action -ne 'editor') { $engineArgs += @('--', ('--'+$Action+'-check')) }
}
$stdout = Join-Path $PSScriptRoot ($Action+'-stdout.log')
$stderr = Join-Path $PSScriptRoot ($Action+'-stderr.log')
$process = Start-Process -FilePath $engine -ArgumentList $engineArgs -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
if ($Action -in @('editor','demo','soma-editor','mv-editor')) { $process.WaitForExit() }
else {
    $deadline = [DateTime]::UtcNow.AddMinutes(3)
    while (-not $process.WaitForExit(1000)) {
        if ((Select-String -LiteralPath $stderr -Pattern 'SCRIPT ERROR:|ERROR:' -Quiet) -or [DateTime]::UtcNow -gt $deadline) {
            Stop-Process -Id $process.Id
            Get-Content -LiteralPath $stdout,$stderr
            throw "Godot $Action failed or timed out; process $($process.Id) stopped"
        }
    }
}
$process.WaitForExit()
Get-Content -LiteralPath $stdout,$stderr
if ($process.ExitCode -ne 0) { throw "Godot $Action failed: $($process.ExitCode)" }
if (Select-String -LiteralPath $stderr -Pattern 'SCRIPT ERROR:|ERROR:' -Quiet) { throw 'Godot reported errors; see logs' }
