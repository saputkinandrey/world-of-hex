param([ValidateSet('prepare','infer','test','parts-controls','parts-runs','parts-heads','head-underfill','assembly','sam-download','sam','sam-evidence','heads','candidates','validate','compare','render','comparison-video')][string]$Action = 'prepare')
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$commands = @{
    'prepare' = @('preprocess.py')
    'infer' = @('infer.py')
    'test' = @('test_preprocess.py')
    'parts-controls' = @('parts.py','controls')
    'parts-runs' = @('parts.py','runs')
    'parts-heads' = @('parts.py','heads')
    'head-underfill' = @('head_underfill.py')
    'assembly' = @('assembly_trials.py')
    'sam-download' = @('sam.py','download')
    'sam' = @('sam.py','infer')
    'sam-evidence' = @('sam_evidence.py')
    'heads' = @('heads.py')
    'candidates' = @('candidates.py')
    'validate' = @('validate_candidates.py')
    'compare' = @('compare.py')
    'render' = @('render.py')
    'comparison-video' = @('comparison_video.py')
}
$pythonCommand = 'python'
if ($Action -notin @('prepare','infer','parts-controls','parts-runs','parts-heads','assembly')) {
    $repositoryPath = (Resolve-Path "$PSScriptRoot/../../../..").Path
    $settings = Get-Content "$repositoryPath/tmp/animation-workbench/seethrough-probe/runtime.json" -Raw | ConvertFrom-Json
    $pythonCommand = "$($settings.tooling)/see-through-windows/see-through/.venv/Scripts/python.exe"
}
$command = $commands[$Action]
$commandArguments = @($command | Select-Object -Skip 1)
if ($Action -eq 'heads') {
    $logDirectory = "$repositoryPath/tmp/animation-workbench/neural/heads"
    New-Item -ItemType Directory -Force $logDirectory | Out-Null
    $logPath = Join-Path $logDirectory ("inference-" + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff') + '.log')
    & $pythonCommand -X faulthandler "$PSScriptRoot/$($command[0])" @commandArguments > $logPath 2>&1
    Get-Content -LiteralPath $logPath -Tail 20
    Write-Output "Full head inference log: $logPath"
}
else { & $pythonCommand -X faulthandler "$PSScriptRoot/$($command[0])" @commandArguments }
if ($LASTEXITCODE -ne 0) { throw "Neural $Action failed with exit code $LASTEXITCODE" }
