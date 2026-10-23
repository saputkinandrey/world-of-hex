param(
    [Parameter(Mandatory=$true)][string]$InputImage,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [int]$Seed = 42,
    [int]$Steps = 20,
    [int]$Resolution = 512,
    [ValidateSet('nearest','bicubic')][string]$Preprocessing = 'bicubic',
    [int]$FrameSize = 0,
    [string]$Evidence
)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path "$PSScriptRoot/../../../..").Path
$runtime = Get-Content "$repository/tmp/animation-workbench/seethrough-probe/runtime.json" -Raw | ConvertFrom-Json
$python = "$($runtime.tooling)/see-through-windows/see-through/.venv/Scripts/python.exe"
$arguments = @('--input',$InputImage,'--output',$OutputDirectory,'--seed',$Seed,'--steps',$Steps,'--resolution',$Resolution,'--preprocessing',$Preprocessing)
if ($FrameSize -gt 0) { $arguments += @('--frame-size',$FrameSize) }
if ($Evidence) { $arguments += @('--evidence',$Evidence) }
$env:PYTHONUTF8 = '1'
& $python "$PSScriptRoot/detect.py" @arguments
if ($LASTEXITCODE -ne 0) { throw "Head skill failed with exit code $LASTEXITCODE" }
