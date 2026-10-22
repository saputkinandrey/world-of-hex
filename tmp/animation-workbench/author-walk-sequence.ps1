$ErrorActionPreference = 'Stop'
$repositoryPath = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$scriptPath = Join-Path $PSScriptRoot 'author-walk-sequence.gd'
$logPath = Join-Path $PSScriptRoot 'author-sequence-engine.log'
$enginePath = 'C:/Program Files (x86)/Steam/steamapps/common/Godot Engine/godot.windows.opt.tools.64.exe'
$arguments = @('--headless', '--path', '.', '--script', ('"' + $scriptPath + '"'), '--log-file', ('"' + $logPath + '"'))
$process = Start-Process -FilePath $enginePath -ArgumentList $arguments -WorkingDirectory (Join-Path $repositoryPath 'godot') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'author-sequence-stdout.log') -RedirectStandardError (Join-Path $PSScriptRoot 'author-sequence-stderr.log')
if (-not $process.WaitForExit(60000)) { Stop-Process -Id $process.Id; throw 'Sequence authoring timed out.' }
$process.WaitForExit()
Get-Content (Join-Path $PSScriptRoot 'author-sequence-stderr.log')
if ($process.ExitCode -ne 0) { throw "Sequence authoring failed: $($process.ExitCode)" }
