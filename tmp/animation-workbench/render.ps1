$ErrorActionPreference = 'Stop'
$repositoryPath = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = Join-Path $repositoryPath 'godot'
$scriptPath = Join-Path $PSScriptRoot 'render-clips.gd'
$logPath = Join-Path $PSScriptRoot 'render-engine.log'
$enginePath = 'C:/Program Files (x86)/Steam/steamapps/common/Godot Engine/godot.windows.opt.tools.64.exe'
$arguments = @('--path', '.', '--rendering-method', 'gl_compatibility', '--script', ('"' + $scriptPath + '"'), '--log-file', ('"' + $logPath + '"'))
$process = Start-Process -FilePath $enginePath -ArgumentList $arguments -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'render-stdout.log') -RedirectStandardError (Join-Path $PSScriptRoot 'render-stderr.log')
if (-not $process.WaitForExit(60000)) {
    Stop-Process -Id $process.Id
    throw 'Rendering timed out.'
}
$process.WaitForExit()
Get-Content (Join-Path $PSScriptRoot 'render-stdout.log'), (Join-Path $PSScriptRoot 'render-stderr.log')
if ($process.ExitCode -ne 0) { throw "Godot exited with code $($process.ExitCode)" }
