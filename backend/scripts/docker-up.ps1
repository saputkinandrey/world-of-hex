[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Services
)

$ErrorActionPreference = 'Stop'

$composeArgs = @('--env-file', '.env', '-f', 'docker-compose.document.yaml', 'up', '-d', '--build')
if ($Services) {
    $composeArgs += $Services
}

& docker compose @composeArgs
exit $LASTEXITCODE
