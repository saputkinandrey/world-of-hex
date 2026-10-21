param(
    [ValidateSet('import', 'test', 'visual-test', 'parse', 'smoke', 'source')]
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
