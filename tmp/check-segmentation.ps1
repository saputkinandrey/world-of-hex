$ErrorActionPreference = 'Stop'
$checks = @('segmentation-check','segmentation-test','mask-test','hand-test','anatomy-test','composition-test','seam-test','surface-test','ligament-test','topology-test','calibration-test','walk-test','run-test','comparison-test','south-west-test','north-west-test','motion-bind-test','skeletal-visual','north-layer-test')
$results = @()
foreach ($check in $checks) {
    try {
        & ./godot/modules/character-animation-workbench/run.ps1 $check
        $results += [PSCustomObject]@{check=$check;status='pass'}
    } catch {
        $results += [PSCustomObject]@{check=$check;status='fail';error=$_.Exception.Message}
    }
}
$results | ConvertTo-Json | Set-Content tmp/animation-workbench/segmentation/checks.json
$results | Format-Table -AutoSize
if ($results.status -contains 'fail') { exit 1 }
