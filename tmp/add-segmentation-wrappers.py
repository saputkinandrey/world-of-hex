from pathlib import Path
p=Path('godot/modules/character-animation-workbench/run.ps1')
s=p.read_text().replace("'segmentation-video', 'segmentation-test', 'segmentation-preview'","'segmentation-video', 'segmentation-test', 'segmentation-preview', 'segmentation-author', 'segmentation-report', 'segmentation-build', 'segmentation-check', 'segmentation-encode'")
needle="if ($Action -eq 'motion-encode') {"
s=s.replace(needle,"""$segmentationTools = @{
    'segmentation-author' = @('author_segmentation.py', '--write')
    'segmentation-report' = @('segmentation_atlas.py', 'after')
    'segmentation-build' = @('compile_segmentation_preview.py')
    'segmentation-check' = @('test_segmentation.py')
    'segmentation-encode' = @('encode_segmentation.py')
}
if ($segmentationTools.ContainsKey($Action)) {
    $tool = $segmentationTools[$Action]
    $toolArguments = @($tool | Select-Object -Skip 1)
    & python (Join-Path $PSScriptRoot ('tools/' + $tool[0])) @toolArguments
    if ($LASTEXITCODE -ne 0) { throw "Segmentation tooling failed: $Action" }
    return
}
"""+needle)
p.write_text(s)
