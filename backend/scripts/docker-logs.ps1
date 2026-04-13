[CmdletBinding()]
param(
    [string]$Service = 'api',
    [int]$Tail = 200,
    [switch]$Follow
)

$ErrorActionPreference = 'Stop'

$composeArgs = @('--env-file', '.env', '-f', 'docker-compose.document.yaml', 'logs')
if ($Follow) {
    $composeArgs += '--follow'
}
$composeArgs += '--tail'
$composeArgs += [string]$Tail
if ($Service) {
    $composeArgs += $Service
}

& docker compose @composeArgs
exit $LASTEXITCODE
