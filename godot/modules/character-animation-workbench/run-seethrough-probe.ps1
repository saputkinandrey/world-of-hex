param(
    [ValidateSet('prepare', 'check', 'install', 'cuda', 'offload-check', 'bicubic', 'nearest')]
    [string]$Action = 'prepare'
)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$repositoryPath = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
if ($Action -in @('prepare','check')) {
    $tool = if ($Action -eq 'prepare') { 'prepare_seethrough_probe.py' } else { 'check_seethrough_probe.py' }
    & python (Join-Path $PSScriptRoot ('tools/' + $tool)) --repo $repositoryPath
} else {
    & python (Join-Path $PSScriptRoot 'tools/seethrough_runtime.py') --repo $repositoryPath $Action
}
if ($LASTEXITCODE -ne 0) { throw "See-through probe $Action failed with exit code $LASTEXITCODE." }
