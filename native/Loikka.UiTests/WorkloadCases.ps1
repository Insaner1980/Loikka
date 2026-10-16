# Process/UIA timings include automation overhead. No legacy speedup is inferred.
function Initialize-SyntheticWorkload {
    $script:CurrentCase = 'PERF-01-fixture'
    $generator = Join-Path $PSScriptRoot '../../tests/migration/create-reference.mjs'
    $manifest = & node $generator --output $DataRoot --workload
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic workload generation failed.' }
    $manifest | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'source-fixture-manifest.json') -Encoding utf8
    $seed = @'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{DatabaseSync}=require('node:sqlite');
const root=process.argv[1];if(!fs.existsSync(path.join(root,'.uia-synthetic-root')))throw Error('synthetic marker missing');
const db=new DatabaseSync(path.join(root,'loikka.db'));
const source=fs.readFileSync(path.join(root,'photos/athletes/1/same.png'));
const insert=db.prepare('insert into photos(id,entity_type,entity_id,file_path,thumbnail_path,original_name,width,height,size_bytes,event_name,created_at) values(?,?,?,?,?,?,?,?,?,?,?)');
db.exec('BEGIN');
for(let i=0;i<1000;i++){
 const original=`photos/athletes/1/workload-${i}.png`,thumb=`photos/thumbnails/workload-${i}.png`;
 fs.writeFileSync(path.join(root,original),source);fs.writeFileSync(path.join(root,thumb),source);
 insert.run(1000+i,'athletes',1,original,thumb,`workload-${i}.png`,16,10,source.length,'Synthetic workload','2026-10-15 12:00:00');
}
db.exec('COMMIT');
const result={additionalResults:5000,additionalPhotoEntries:1000,results:db.prepare('select count(*) n from results').get().n,photos:db.prepare('select count(*) n from photos').get().n,firstResult:db.prepare('select id from results order by date desc,id desc limit 1').get().id,firstPhoto:db.prepare('select id from photos order by created_at desc,id desc limit 1').get().id,sourcePngSha256:crypto.createHash('sha256').update(source).digest('hex')};
db.close();console.log(JSON.stringify(result));
'@
    $summary = & node -e $seed $DataRoot
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic media workload generation failed.' }
    $summary | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'workload.json') -Encoding utf8
    $script:Workload = $summary | ConvertFrom-Json
    $script:Measurements = [Collections.Generic.List[object]]::new()
}
function Measure-OwnedStep([string]$Name, [int]$Iteration, [scriptblock]$Action) {
    $timer = [Diagnostics.Stopwatch]::StartNew()
    & $Action | Out-Null
    $timer.Stop()
    $script:AppProcess.Refresh()
    $script:Measurements.Add([ordered]@{ operation = $Name; iteration = $Iteration; milliseconds = [Math]::Round($timer.Elapsed.TotalMilliseconds, 2); workingSetBytes = $script:AppProcess.WorkingSet64; peakWorkingSetBytes = $script:AppProcess.PeakWorkingSet64; privateBytes = $script:AppProcess.PrivateMemorySize64 })
}
function Scroll-OwnedList([string]$RowId) {
    $element = Wait-Control $RowId
    $scroll = $null
    for ($level = 0; $level -lt 12 -and $element; $level++) {
        if ($element.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$scroll) -and $scroll.Current.VerticallyScrollable) { break }
        $scroll = $null
        $element = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($element)
    }
    if (-not $scroll) { throw 'No scrollable owned list exposes ScrollPattern.' }
    $scroll.SetScrollPercent(-1, 100)
    $null = Wait-Until { $scroll.Current.VerticalScrollPercent -ge 99 } 'workload list bottom'
    $scroll.SetScrollPercent(-1, 0)
    $null = Wait-Until { $scroll.Current.VerticalScrollPercent -le 1 } 'workload list top'
}
function Invoke-WorkloadCases {
    $script:CurrentCase = 'PERF-01-native-workload'
    for ($iteration = 0; $iteration -lt 5; $iteration++) {
        if ($iteration -gt 0) { $script:LaunchTimer = [Diagnostics.Stopwatch]::StartNew(); Start-OwnedApp }
        $null = Wait-Control ('DashboardResult' + $script:Workload.firstResult)
        $script:LaunchTimer.Stop()
        $script:AppProcess.Refresh()
        $script:Measurements.Add([ordered]@{ operation = 'process-launch-to-dashboard'; iteration = $iteration; milliseconds = [Math]::Round($script:LaunchTimer.Elapsed.TotalMilliseconds, 2); peakWorkingSetBytes = $script:AppProcess.PeakWorkingSet64 })
        Measure-OwnedStep 'result-navigation' $iteration {
            Go-To 'Results'
            $null = Wait-Control ('ResultRow' + $script:Workload.firstResult)
        }
        Measure-OwnedStep 'result-scroll-bottom-top' $iteration { Scroll-OwnedList ('ResultRow' + $script:Workload.firstResult) }
        Measure-OwnedStep 'statistics-chart-navigation' $iteration {
            Go-To 'Statistics'
            $null = Wait-Control 'StatsSeason'
            $chartCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, 'Kaavion arvot aikajärjestyksessä')
            $null = Wait-Until { $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $chartCondition).Count -eq 2 } 'two workload chart data lists'
        }
        Measure-OwnedStep 'gallery-navigation' $iteration {
            Go-To 'Photos'
            $null = Wait-Control ('PhotoRow' + $script:Workload.firstPhoto)
        }
        Measure-OwnedStep 'gallery-scroll-bottom-top' $iteration { Scroll-OwnedList ('PhotoRow' + $script:Workload.firstPhoto) }
        Measure-OwnedStep 'image-open-close' $iteration {
            Open-Row ('PhotoRow' + $script:Workload.firstPhoto)
            $null = Wait-Control 'ViewerClose'
            Invoke-Control 'ViewerClose'
            Wait-Absent 'ViewerClose'
            $null = Wait-Control ('PhotoRow' + $script:Workload.firstPhoto)
        }
        Measure-OwnedStep 'json-export-with-native-picker' $iteration {
            Go-To 'Settings'
            Foreground-OwnedApp
            Invoke-Control 'ExportJson'
            $filename = 'workload-export-' + $iteration + '.json'
            Pick-SyntheticFile $filename -EvidenceJson -Save
            Assert-WindowText 'Tiedot viety onnistuneesti.'
            $export = Get-Content -LiteralPath (Join-Path $EvidenceRoot $filename) -Raw -Encoding UTF8 | ConvertFrom-Json
            if (@($export.results).Count -ne $script:Workload.results) { throw 'Workload export lost results.' }
        }
        Stop-OwnedApp
        if (-not $script:AppProcess.HasExited) { throw 'Workload process survived close.' }
        $lock = [IO.File]::Open($DataRoot + '.instance.lock', [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        $lock.Dispose()
        $database = [IO.File]::Open((Join-Path $DataRoot 'loikka.db'), [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        $database.Dispose()
    }
    $summary = foreach ($group in $script:Measurements | Group-Object { $_.operation }) {
        $values = @($group.Group.milliseconds | Sort-Object)
        [ordered]@{ operation = $group.Name; samples = $values.Count; p50Milliseconds = $values[[int][Math]::Ceiling($values.Count * .5) - 1]; p95Milliseconds = $values[[int][Math]::Ceiling($values.Count * .95) - 1] }
    }
    [ordered]@{
        artifactIdentity = $script:ArtifactIdentity
        machine = [ordered]@{ os = [Environment]::OSVersion.VersionString; processor = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name); memoryBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory }
        workload = $script:Workload; dataRoot = $DataRoot
        cacheScope = 'Five process launches; OS disk caches were not flushed. First launch is not certified as cold-cache.'
        timingScope = 'Elapsed UIA-observed operations include automation/picker/JSON verification overhead; no frame-time claim.'
        legacyComparison = 'Not run: actual legacy runtime unavailable. No relative performance or threshold acceptance claimed.'
        canceledCloudTransfer = 'Deferred with Google live acceptance by the user.'
        measurements = $script:Measurements.ToArray(); percentiles = @($summary)
        ownedPids = $script:OwnedProcesses.ToArray(); everyProcessExited = $true; databaseAndInstanceLocksReleased = $true
    } | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'performance.json') -Encoding utf8
    Receipt $script:CurrentCase 'Five native process/navigation/scroll/chart/gallery/viewer/export cycles measured on5000 additional results and1000 additional photo entries; all owned processes and data locks released. Legacy thresholds/cold-cache/cloud cancellation remain unverified.'
}
