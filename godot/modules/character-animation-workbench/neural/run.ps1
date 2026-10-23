param([ValidateSet('prepare','infer','test','parts-controls','parts-runs','parts-heads','assembly','sam-download','sam','heads','candidates','validate','compare','render')][string]$Action = 'prepare')
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$commands = @{
    'prepare' = @('preprocess.py')
    'infer' = @('infer.py')
    'test' = @('test_preprocess.py')
    'parts-controls' = @('parts.py','controls')
    'parts-runs' = @('parts.py','runs')
    'parts-heads' = @('parts.py','heads')
    'assembly' = @('assembly_trials.py')
    'sam-download' = @('sam.py','download')
    'sam' = @('sam.py','infer')
    'heads' = @('heads.py')
    'candidates' = @('candidates.py')
    'validate' = @('validate_candidates.py')
    'compare' = @('compare.py')
    'render' = @('render.py')
}
$pythonCommand = 'python'
if ($Action -notin @('prepare','infer','parts-controls','parts-runs','parts-heads','assembly')) {
    $repositoryPath = (Resolve-Path "$PSScriptRoot/../../../..").Path
    $settings = Get-Content "$repositoryPath/tmp/animation-workbench/seethrough-probe/runtime.json" -Raw | ConvertFrom-Json
    $pythonCommand = "$($settings.tooling)/see-through-windows/see-through/.venv/Scripts/python.exe"
}
$command = $commands[$Action]
$commandArguments = @($command | Select-Object -Skip 1)
& $pythonCommand "$PSScriptRoot/$($command[0])" @commandArguments
if ($LASTEXITCODE -ne 0) { throw "Neural $Action failed with exit code $LASTEXITCODE" }
