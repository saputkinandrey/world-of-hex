[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$queryPath = Join-Path $PSScriptRoot '..\\tmp\\mongo-query.js'
$databasePath = Join-Path $PSScriptRoot '..\\tmp\\mongo-query.database.txt'

if (-not (Test-Path $queryPath)) {
    throw "Mongo query file not found: $queryPath"
}

$query = Get-Content -Path $queryPath -Raw
if ([string]::IsNullOrWhiteSpace($query)) {
    throw "Mongo query file is empty: $queryPath"
}

$database = 'test'
if (Test-Path $databasePath) {
    $configuredDatabase = (Get-Content -Path $databasePath -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($configuredDatabase)) {
        $database = $configuredDatabase
    }
}

$envPath = Join-Path $PSScriptRoot '..\\.env'
$envValues = @{}

if (Test-Path $envPath) {
    Get-Content -Path $envPath | ForEach-Object {
        if ($_ -match '^\s*#') {
            return
        }
        if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            $envValues[$key] = $value
        }
    }
}

$username = $envValues['DATABASE_USERNAME']
if (-not $username) {
    $username = 'root'
}

$password = $envValues['DATABASE_PASSWORD']
if (-not $password) {
    $password = 'secret'
}

$composeArgs = @(
    '--env-file',
    '.env',
    '-f',
    'docker-compose.document.yaml',
    'exec',
    '-T',
    'mongo',
    'mongosh',
    '--quiet',
    '--username',
    $username,
    '--password',
    $password,
    '--authenticationDatabase',
    'admin',
    $database,
    '--eval',
    $query
)

& docker compose @composeArgs
exit $LASTEXITCODE
