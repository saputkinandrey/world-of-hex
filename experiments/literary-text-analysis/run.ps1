param(
    [ValidateSet('probe','parse','analyze','review-export','review-import','report','test','verify','acceptance')][string]$Action='test',
    [ValidateSet('fable','qwen')][string]$Model='qwen',
    [string]$InputFile,
    [string]$OutputDirectory,
    [ValidateSet('en','ru')][string]$Language='en',
    [int]$Start=0,
    [int]$End=-1,
    [int]$ContextTokens=3072,
    [switch]$AuthoredFixture,
    [string]$ReviewFile
)
$ErrorActionPreference='Stop'
$env:PYTHONDONTWRITEBYTECODE='1'
$env:PYTHONUTF8='1'
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
$env:USE_TF='0'
$python=Join-Path $PSScriptRoot '../literary-decision-encoders/.venv/Scripts/python.exe'
if ($Action -eq 'probe') {
    foreach ($key in @('fable','qwen')) {
        & $python (Join-Path $PSScriptRoot 'probe.py') $key
        if ($LASTEXITCODE -ne 0) { throw "Model probe failed: $key" }
    }
} elseif ($Action -eq 'test') {
    & $python -m unittest discover -s $PSScriptRoot -p 'test_*.py'
} elseif ($Action -eq 'verify') {
    & $python (Join-Path $PSScriptRoot 'audit.py') verify
} elseif ($Action -eq 'acceptance') {
    & $python (Join-Path $PSScriptRoot 'acceptance.py')
} else {
    $cliArguments=@($Action)
    if ($InputFile) { $cliArguments+=@('--input',$InputFile) }
    if ($OutputDirectory) { $cliArguments+=@('--output',$OutputDirectory) }
    if ($ReviewFile) { $cliArguments+=@('--review',$ReviewFile) }
    if ($Action -in @('analyze','parse')) { $cliArguments+=@('--language',$Language) }
    if ($Action -eq 'analyze') { $cliArguments+=@('--model',$Model,'--start',$Start,'--end',$End,'--context-tokens',$ContextTokens) }
    if ($AuthoredFixture) { $cliArguments+='--authored-fixture' }
    & $python (Join-Path $PSScriptRoot 'cli.py') @cliArguments
}
if ($LASTEXITCODE -ne 0) { throw "Literary text analyzer $Action failed: exit $LASTEXITCODE" }
