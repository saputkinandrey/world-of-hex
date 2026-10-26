# Fixed sequential workflow. No parallel GPU processes or dependency installation.
$ErrorActionPreference='Stop'
$runner=Join-Path $PSScriptRoot 'run.ps1'
foreach ($case in @(
    @{Name='final-fable-en'; Model='fable'; Language='en'},
    @{Name='final-qwen-en'; Model='qwen'; Language='en'},
    @{Name='final-qwen-ru'; Model='qwen'; Language='ru'}
)) {
    $document=Join-Path $PSScriptRoot "fixtures/document-$($case.Language).json"
    $output=Join-Path $PSScriptRoot "runs/$($case.Name)"
    & $runner analyze -InputFile $document -OutputDirectory $output -Model $case.Model -Language $case.Language *> (Join-Path $PSScriptRoot "$($case.Name).log")
    if ($LASTEXITCODE -ne 0) { throw "Experiment failed: $($case.Name)" }
    $packet=Join-Path $output 'review/packet.json'
    if (-not (Test-Path -LiteralPath $packet)) {
        & $runner review-export -InputFile $output -OutputDirectory $packet
    }
}
& $runner report -InputFile (Join-Path $PSScriptRoot 'runs') -OutputDirectory (Join-Path $PSScriptRoot 'REPORT.md')
