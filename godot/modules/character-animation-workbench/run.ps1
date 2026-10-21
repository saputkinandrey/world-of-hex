param(
    [ValidateSet('import', 'test', 'visual-test', 'parse', 'smoke', 'source', 'deformation', 'skeletal-test', 'skeletal-visual', 'skeletal-smoke', 'skeletal-proof', 'skeletal-editor', 'walk-render', 'walk-test', 'walk-preview', 'run-bake', 'run-test', 'run-render', 'run-preview', 'north-bake', 'comparison-test', 'comparison-render', 'comparison-preview', 'north-layer-test')]
    [string]$Action = 'test'
)
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$repositoryPath = (Resolve-Path (Join-Path $projectPath '..')).Path
$outputPath = Join-Path $repositoryPath 'tmp/animation-workbench'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$enginePath = $env:GODOT_BIN
if (-not $enginePath) {
    $engineCommand = Get-Command godot -ErrorAction SilentlyContinue
    if ($engineCommand) { $enginePath = $engineCommand.Source }
    else { $enginePath = 'C:/Program Files (x86)/Steam/steamapps/common/Godot Engine/godot.windows.opt.tools.64.exe' }
}
if (-not (Test-Path -LiteralPath $enginePath)) { throw 'Set GODOT_BIN to the Godot executable.' }
$modulePath = 'res://modules/character-animation-workbench'
$engineLogPath = Join-Path $outputPath "$Action-engine.log"
$engineArguments = @('--path', '.', '--log-file', ('"' + $engineLogPath + '"'))
switch ($Action) {
    'north-layer-test' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/north-layer-acceptance.gd") }
    'north-bake' { $engineArguments += @('--headless', '--script', "$modulePath/tests/author-north.gd") }
    'comparison-test' { $engineArguments += @('--headless', '--script', "$modulePath/tests/comparison-acceptance.gd") }
    'comparison-render' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/render-comparison.gd") }
    'comparison-preview' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/tests/comparison-preview.tscn", '--quit-after', '300') }
    'run-bake' { $engineArguments += @('--headless', '--script', "$modulePath/tests/author-run.gd") }
    'run-test' { $engineArguments += @('--headless', '--script', "$modulePath/tests/run-acceptance.gd") }
    'run-render' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/render-run.gd") }
    'run-preview' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/tests/run-sequence-preview.tscn", '--quit-after', '300') }
    'walk-preview' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/tests/walk-sequence-preview.tscn", '--quit-after', '300') }
    'walk-test' { $engineArguments += @('--headless', '--script', "$modulePath/tests/walk-acceptance.gd") }
    'walk-render' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/render-walk.gd") }
    'skeletal-editor' { $engineArguments += @('--headless', '--editor', '--import', "$modulePath/skeletal-animation-workbench.tscn") }
    'skeletal-proof' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/tests/deformation-proof.tscn", '--quit-after', '120') }
    'skeletal-test' { $engineArguments += @('--headless', '--script', "$modulePath/tests/skeletal-acceptance.gd") }
    'skeletal-visual' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/skeletal-acceptance.gd") }
    'skeletal-smoke' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/skeletal-animation-workbench.tscn", '--quit-after', '120') }
    'deformation' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/render-deformation.gd") }
    'import' { $engineArguments += @('--headless', '--script', "$modulePath/import-source.gd") }
    'test' { $engineArguments += @('--headless', '--script', "$modulePath/tests/acceptance.gd") }
    'visual-test' { $engineArguments += @('--rendering-method', 'gl_compatibility', '--script', "$modulePath/tests/acceptance.gd") }
    'parse' { $engineArguments += @('--headless', '--editor', '--import') }
    'smoke' { $engineArguments += @('--rendering-method', 'gl_compatibility', "$modulePath/character-animation-workbench.tscn", '--quit-after', '120') }
    'source' { $engineArguments += @('--headless', 'res://modules/character-sprite-tool/character-sprite-tool.tscn', '--quit-after', '3') }
}
$stdoutPath = Join-Path $outputPath "$Action-stdout.log"
$stderrPath = Join-Path $outputPath "$Action-stderr.log"
$engineProcess = Start-Process -FilePath $enginePath -ArgumentList $engineArguments -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
if (-not $engineProcess.WaitForExit(60000)) {
    Stop-Process -Id $engineProcess.Id
    Get-Content -LiteralPath $stdoutPath, $stderrPath
    throw "Godot $Action timed out after 60 seconds."
}
$engineProcess.WaitForExit()
Get-Content -LiteralPath $stdoutPath, $stderrPath
if ($engineProcess.ExitCode -ne 0) { throw "Godot $Action exited with code $($engineProcess.ExitCode)." }
if (Select-String -LiteralPath $stderrPath -Pattern 'SCRIPT ERROR:|ERROR:' -Quiet) { throw "Godot $Action reported errors; inspect $stderrPath." }
