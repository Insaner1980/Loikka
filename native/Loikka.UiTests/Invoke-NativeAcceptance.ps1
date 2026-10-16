param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [string]$DataRoot = (Join-Path $env:TEMP ('Loikka-UI-' + [guid]::NewGuid().ToString('N'))),
    [string]$EvidenceRoot = (Join-Path $PSScriptRoot ('../../.native-artifacts/native-uia/' + [guid]::NewGuid().ToString('N'))),
    [switch]$PhotosOnly,
    [switch]$LocalToolsOnly,
    [switch]$WorkloadOnly,
    [switch]$RegressionOnly
)
$ErrorActionPreference = 'Stop'
if (@($PhotosOnly, $LocalToolsOnly, $WorkloadOnly, $RegressionOnly | Where-Object { $_ }).Count -gt 1) { throw 'Choose one focused acceptance mode.' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$Executable = (Resolve-Path -LiteralPath $Executable).Path
if (-not [IO.Path]::IsPathRooted($DataRoot)) { throw 'DataRoot must be an absolute, new isolated directory.' }
$DataRoot = [IO.Path]::GetFullPath($DataRoot)
if (Test-Path -LiteralPath $DataRoot) { throw 'DataRoot already exists. Use a new isolated directory; no existing installation is opened.' }
$EvidenceRoot = [IO.Path]::GetFullPath($EvidenceRoot)
$null = New-Item -ItemType Directory -Path $DataRoot
$null = New-Item -ItemType Directory -Force -Path $EvidenceRoot
Set-Content -LiteralPath (Join-Path $DataRoot '.uia-synthetic-root') -Value 'Synthetic acceptance data only.'
$script:Receipts = [Collections.Generic.List[object]]::new()
$script:OwnedProcesses = [Collections.Generic.List[int]]::new()
$script:AppProcess = $null
$script:Window = $null
$script:CurrentCase = 'launch'
$script:Failure = $null
$script:CalendarLocaleVerified = $false
$script:StartedAt = [datetime]::UtcNow.ToString('o')
$artifactDirectory = Split-Path -Parent $Executable
$artifactNames = @('Loikka.App.exe','Loikka.App.dll','Loikka.Core.dll','Loikka.Infrastructure.dll','resources.pri','Loikka.App.pri','Loikka.App.runtimeconfig.json','Loikka.App.deps.json')
$script:ArtifactIdentity = @(foreach ($artifactName in $artifactNames) {
    $artifactPath = Join-Path $artifactDirectory $artifactName
    if (Test-Path -LiteralPath $artifactPath) {
        [ordered]@{ name = $artifactName; sha256 = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash; lastWriteTimeUtc = (Get-Item -LiteralPath $artifactPath).LastWriteTimeUtc.ToString('o') }
    }
})

function Find-Control([string]$Id) {
    if (-not $script:Window) { return $null }
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $Id)
    $found = $script:Window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($found) { return $found }
    # Observed WinUI ContentDialog template IDs; one dialog is active at a time.
    $templateIds = @{ DialogSave = 'PrimaryButton'; DialogCancel = 'CloseButton'; DialogDelete = 'SecondaryButton'; ConfirmAccept = 'PrimaryButton'; ConfirmCancel = 'CloseButton' }
    if ($templateIds.ContainsKey($Id)) {
        $condition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $templateIds[$Id])
        return $script:Window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    }
}
function Wait-Until([scriptblock]$Probe, [string]$Description, [int]$Seconds = 20) {
    $deadline = [datetime]::UtcNow.AddSeconds($Seconds)
    do {
        $probeResult = & $Probe
        if ($probeResult) { return $probeResult }
        if ($script:AppProcess -and $script:AppProcess.HasExited) { throw "Native process exited while waiting for $Description." }
        Start-Sleep -Milliseconds 100
    } while ([datetime]::UtcNow -lt $deadline)
    throw "Timeout waiting for $Description."
}
function Wait-Control([string]$Id) { Wait-Until { Find-Control $Id } "native control $Id" }
function Wait-Absent([string]$Id) { $null = Wait-Until { -not (Find-Control $Id) } "control $Id to disappear" }
function Invoke-Control([string]$Id) {
    $control = Wait-Control $Id
    $null = Wait-Until { $control.Current.IsEnabled } "enabled control $Id"
    [ordered]@{ requestedId = $Id; actualId = $control.Current.AutomationId; name = $control.Current.Name; offscreen = $control.Current.IsOffscreen; time = [datetime]::UtcNow.ToString('o') } |
        ConvertTo-Json -Compress | Add-Content -LiteralPath (Join-Path $EvidenceRoot 'invocations.jsonl') -Encoding utf8
    $control.SetFocus()
    $control.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}
function Set-Text([string]$Id, [string]$Value) {
    $pattern = Text-Pattern $Id
    $pattern.SetValue($Value)
    $null = Wait-Until { $pattern.Current.Value -eq $Value } "value of $Id"
}
function Text-Pattern([string]$Id) {
    $control = Wait-Control $Id
    $pattern = $null
    if ($control.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) { return $pattern }
    # Live UIA exposes AutoSuggestBox as Group with its value on a child Edit.
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
    $textInput = $control.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if (-not $textInput) { throw "No editable value is exposed for $Id." }
    $textInput.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
}
function Select-Choice([string]$Id, [string]$Name) {
    $control = Wait-Control $Id
    $control.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand()
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    # Long native ComboBox lists virtualize entries beyond the visible popup.
    $container = $null
    $choice = if ($control.TryGetCurrentPattern([System.Windows.Automation.ItemContainerPattern]::Pattern, [ref]$container)) {
        $container.FindItemByProperty($null, [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    } else { $null }
    if ($choice) {
        $virtualized = $null
        if ($choice.TryGetCurrentPattern([System.Windows.Automation.VirtualizedItemPattern]::Pattern, [ref]$virtualized)) { $virtualized.Realize() }
        $scrollItem = $null
        if ($choice.TryGetCurrentPattern([System.Windows.Automation.ScrollItemPattern]::Pattern, [ref]$scrollItem)) { $scrollItem.ScrollIntoView() }
    }
    # Realization/scroll can replace the provider; reacquire the live item.
    $choice = Wait-Until { $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $nameCondition) |
        Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::ListItem } | Select-Object -First 1 } "choice $Name in $Id"
    $choice.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    $collapse = $null
    if ($control.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$collapse)) { $collapse.Collapse() }
}
function Go-To([string]$Page) {
    if ($Page -eq 'Athletes' -and (Find-Control 'PageAthleteDetail')) {
        Invoke-Control 'BackToAthletes'
        $null = Wait-Control 'PageAthletes'
        return
    }
    $item = Wait-Control ('Nav' + $Page)
    $null = Wait-Until { $item.Current.IsEnabled } "navigation $Page enabled"
    $item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    $null = Wait-Control ('Page' + $Page)
}
function Control-Text([string]$Id) {
    $control = Wait-Control $Id
    $names = @($control.Current.Name)
    foreach ($child in $control.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
        if ($child.Current.Name) { $names += $child.Current.Name }
    }
    $names -join ' | '
}
function Assert-Text([string]$Id, [string]$Expected) {
    $null = Wait-Until { (Control-Text $Id).Contains($Expected) } "$Id containing $Expected"
}
function Assert-WindowText([string]$Expected) {
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Expected)
    $null = Wait-Until { $script:Window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition) } "visible text $Expected"
}
function Open-Row([string]$Id) {
    (Wait-Control $Id).GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}
function Select-Tab([string]$Name) {
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    $tab = Wait-Until {
        foreach ($candidate in $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $nameCondition)) {
            if ($candidate.Current.AutomationId -like 'Nav*') { continue }
            $selection = $null
            if ($candidate.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) { return $candidate }
        }
    } "athlete tab $Name"
    $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    $null = Wait-Until { $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected } "selected tab $Name"
}
function Owned-Elements {
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $script:AppProcess.Id)
    foreach ($root in [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)) {
        $root
        foreach ($child in $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) { $child }
    }
}
function Select-ListChoice([string]$ListId, [string]$Name) {
    $list = Wait-Control $ListId
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    $choice = Wait-Until {
        foreach ($candidate in $list.FindAll([System.Windows.Automation.TreeScope]::Descendants, $nameCondition)) {
            $selection = $null
            if ($candidate.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) { return $candidate }
        }
    } "$Name in $ListId"
    $choice.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
}
function Set-CalendarDate([datetime]$Target) {
    $control = Wait-Control 'ResultDate'
    $pattern = $control.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if (-not $pattern.Current.IsReadOnly) {
        try { $pattern.SetValue($Target.ToString('d.M.yyyy', [Globalization.CultureInfo]::GetCultureInfo('fi-FI'))); return }
        catch { Write-Output ('Calendar ValuePattern rejected text; inspecting the native calendar: ' + $_.Exception.Message) }
    }
    if (-not ('LoikkaUiTestFocus' -as [type])) { Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LoikkaUiTestFocus {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
    }
    $ownedHandle = [IntPtr]::new($script:Window.Current.NativeWindowHandle)
    $null = [LoikkaUiTestFocus]::SetForegroundWindow($ownedHandle)
    $null = Wait-Until { [LoikkaUiTestFocus]::GetForegroundWindow() -eq $ownedHandle } 'owned Loikka foreground for calendar flyout' 3
    Invoke-Control 'ResultDate'
    $calendar = Wait-Until { Owned-Elements | Where-Object { $_.Current.AutomationId -eq 'CalendarView' } | Select-Object -First 1 } 'owned native calendar flyout'
    $headerCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'HeaderButton')
    $weekdayCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'WeekDay1')
    $header = ($calendar.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $headerCondition).Current.Name -replace '\p{Cf}', '').ToLowerInvariant()
    $weekday = ($calendar.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $weekdayCondition).Current.Name -replace '\p{Cf}', '').ToLowerInvariant()
    $finnishMonth = $Target.ToString('MMMM', [Globalization.CultureInfo]::GetCultureInfo('fi-FI'))
    if (-not $header.Contains($finnishMonth) -or $weekday -ne 'maanantai') { throw "Calendar flyout is not Finnish/Monday-first: header=$header; first weekday=$weekday" }
    if (-not $script:CalendarLocaleVerified) {
        Receipt 'CAL-01-picker-locale' "Owned calendar flyout header=$header; first weekday=$weekday."
        $script:CalendarLocaleVerified = $true
    }
    $dayCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Target.Day.ToString())
    # Midmonth is deliberate: adjacent-month spillover cannot duplicate day14/15.
    $day = Wait-Until { $calendar.FindAll([System.Windows.Automation.TreeScope]::Descendants, $dayCondition) |
        Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::DataItem } | Select-Object -First 1 } "native calendar day $($Target.ToString('yyyy-MM-dd'))"
    $selection = $null
    if ($day.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) { $selection.Select() }
    else { $day.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
}
function Receipt([string]$Case, [string]$Detail) {
    $script:Receipts.Add([ordered]@{ case = $Case; status = 'pass'; detail = $Detail; time = [datetime]::UtcNow.ToString('o') })
    Write-Output "PASS $Case $Detail"
}
function Stop-OwnedApp {
    if ($script:AppProcess -and -not $script:AppProcess.HasExited) {
        $null = $script:AppProcess.CloseMainWindow()
        if (-not $script:AppProcess.WaitForExit(5000)) { Stop-Process -Id $script:AppProcess.Id; $null = $script:AppProcess.WaitForExit(5000) }
    }
    $script:Window = $null
}
function Start-OwnedApp {
    $script:AppProcess = Start-Process -FilePath $Executable -ArgumentList '--data-root', ('"' + $DataRoot + '"') -PassThru
    $script:OwnedProcesses.Add($script:AppProcess.Id)
    $script:Window = Wait-Until {
        $processCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $script:AppProcess.Id)
        $titleCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::NameProperty, 'Loikka')
        $windowCondition = New-Object System.Windows.Automation.AndCondition($processCondition, $titleCondition)
        # Reacquire while startup replaces its initial UIA provider.
        [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children, $windowCondition)
    } 'initialized Loikka window owned by the started process' 25
    $null = Wait-Control 'PageDashboard'
}
function Capture-Failure {
    if (-not $script:Window) { return }
    if ($script:PickerOpen) {
        Set-Content -LiteralPath (Join-Path $EvidenceRoot 'picker-boundary.txt') -Value 'OS picker is open. Its file listing is deliberately not captured.'
        $dialogCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::NameProperty, 'Muokkaa urheilijaa')
        $dialog = $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $dialogCondition) |
            Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window } | Select-Object -First 1
        if ($dialog) {
            $textCondition = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text)
            @($dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $textCondition) | ForEach-Object { $_.Current.Name }) |
                ConvertTo-Json | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'synthetic-athlete-form-text.json') -Encoding utf8
        }
        return
    }
    try {
        $tree = foreach ($element in (Owned-Elements)) {
            $valuePattern = $null
            $value = if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) { $valuePattern.Current.Value } else { $null }
            [ordered]@{ id = $element.Current.AutomationId; name = $element.Current.Name; type = $element.Current.ControlType.ProgrammaticName; enabled = $element.Current.IsEnabled; offscreen = $element.Current.IsOffscreen; value = $value; patterns = @($element.GetSupportedPatterns() | ForEach-Object ProgrammaticName) }
        }
        $tree | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'failure-uia.json') -Encoding utf8
        Set-Content -LiteralPath (Join-Path $EvidenceRoot 'screenshot-not-captured.txt') -Value 'UIA tree only. Desktop pixels are not captured because another application may occlude the owned window.'
    } catch { Set-Content -LiteralPath (Join-Path $EvidenceRoot 'capture-error.txt') -Value $_.Exception.Message }
}

function Foreground-OwnedApp {
    if (-not ('LoikkaPickerOwnership' -as [type])) { Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LoikkaPickerOwnership {
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint command);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
    }
    $handle = [IntPtr]::new($script:Window.Current.NativeWindowHandle)
    $null = [LoikkaPickerOwnership]::SetForegroundWindow($handle)
    $null = Wait-Until { [LoikkaPickerOwnership]::GetForegroundWindow() -eq $handle } 'owned Loikka foreground for file picker' 3
}
function Invoke-Name([string]$Name) {
    if ($Name -eq 'Valitse profiilikuva') { Foreground-OwnedApp }
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    $button = Wait-Until { $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $nameCondition) |
        Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button } | Select-Object -First 1 } "owned button $Name"
    $button.SetFocus()
    $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}
function Pick-SyntheticFile([string]$FileName, [switch]$Cancel, [switch]$EvidenceJson, [switch]$Save) {
    $script:PickerOpen = $true
    $observed = [Collections.Generic.List[object]]::new()
    $mainHandle = [IntPtr]::new($script:Window.Current.NativeWindowHandle)
    $picker = Wait-Until {
        try {
            $candidates = @([System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)) +
                @($script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.NativeWindowHandle -ne 0 })
        }
        catch [System.Windows.Automation.ElementNotAvailableException] {
            # Opening the native picker can replace UIA children during enumeration.
            # Wait-Until retries within its deadline and still rejects an exited app.
            return $null
        }
        foreach ($candidate in $candidates) {
            $owned = Test-PickerOwner $candidate $mainHandle
            if ($owned) {
                $observed.Add([ordered]@{ class = $candidate.Current.ClassName; id = $candidate.Current.AutomationId; pid = $candidate.Current.ProcessId; hwnd = $candidate.Current.NativeWindowHandle })
                $observed | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'owned-picker-window-metadata.json') -Encoding utf8
                $fileCondition = New-Object System.Windows.Automation.PropertyCondition(
                    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1148')
                if ($candidate.Current.ClassName -eq '#32770' -or $candidate.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $fileCondition)) { return $candidate }
            }
        }
    } 'OS file picker owned by the started Loikka window'
    $controlMetadata = @($picker.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition) |
        Where-Object { $_.Current.ControlType -in @([System.Windows.Automation.ControlType]::Edit,[System.Windows.Automation.ControlType]::Button,[System.Windows.Automation.ControlType]::ComboBox) } |
        ForEach-Object { [ordered]@{ id = $_.Current.AutomationId; type = $_.Current.ControlType.ProgrammaticName; class = $_.Current.ClassName } })
    $controlMetadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'picker-controls.json') -Encoding utf8
    $cancelCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '2')
    $pickerHandle = [IntPtr]::new($picker.Current.NativeWindowHandle)
    if ($Cancel) {
        $cancelButton = $picker.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cancelCondition) |
            Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $_.Current.ClassName -eq 'Button' } | Select-Object -First 1
        if (-not $cancelButton) { throw 'Owned picker has no observed cancel control2; see metadata-only picker-controls.json.' }
        [ordered]@{ id = $cancelButton.Current.AutomationId; class = $cancelButton.Current.ClassName; hwnd = $cancelButton.Current.NativeWindowHandle; patterns = @($cancelButton.GetSupportedPatterns() | ForEach-Object ProgrammaticName) } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'picker-cancel-control.json') -Encoding utf8
        $cancelButton.SetFocus()
        $cancelButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    }
    else {
        Set-SyntheticPickerFile $picker $FileName $EvidenceJson $Save
    }
    $null = Wait-Until { -not [LoikkaPickerOwnership]::IsWindowVisible($pickerHandle) } 'owned file picker to close'
    $script:PickerOpen = $false
    $windowPattern = $script:Window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
    $null = $windowPattern.WaitForInputIdle(3000)
}
function Send-OwnedKey([string]$Keys) {
    Add-Type -AssemblyName System.Windows.Forms
    Foreground-OwnedApp
    $null = Wait-Control 'ViewerClose'
    if ([LoikkaPickerOwnership]::GetForegroundWindow() -ne [IntPtr]::new($script:Window.Current.NativeWindowHandle)) { throw 'Owned Loikka lost foreground before viewer key input.' }
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
}
function Set-ViewerPosition([int]$Position) {
    $control = Wait-Control 'ViewerPosition'
    $range = $null
    if ($control.TryGetCurrentPattern([System.Windows.Automation.RangeValuePattern]::Pattern, [ref]$range)) { $range.SetValue($Position) }
    else { Set-Text 'ViewerPosition' $Position.ToString(); (Wait-Control 'ViewerNext').SetFocus() }
}
function Photo-State([string]$Stage) {
    $reader = @'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{DatabaseSync}=require('node:sqlite');
const root=process.argv[1],db=new DatabaseSync(path.join(root,'loikka.db'),{readOnly:true});
const hash=p=>{const full=path.resolve(root,p);if(!full.toLowerCase().startsWith(root.toLowerCase()+path.sep))throw Error('unmanaged path');if(!fs.existsSync(full))return null;const b=fs.readFileSync(full),png=b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));return {path:p,sha256:crypto.createHash('sha256').update(b).digest('hex'),length:b.length,pngWidth:png?b.readUInt32BE(16):null,pngHeight:png?b.readUInt32BE(20):null}};
const result={athletes:db.prepare('select id,photo_path from athletes').all(),photos:db.prepare('select * from photos order by id').all()};
result.files=result.photos.flatMap(p=>[hash(p.file_path),p.thumbnail_path?hash(p.thumbnail_path):null]).concat(result.athletes.map(a=>a.photo_path?hash(a.photo_path):null)).filter(Boolean);
const walk=p=>fs.existsSync(path.join(root,p))?fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[hash(path.join(p,e.name))]):[];
result.managedFiles=['photos','profile_photos'].flatMap(walk);db.close();console.log(JSON.stringify(result));
'@
    $json = & node -e $reader $DataRoot
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic SQLite photo verification failed.' }
    $json | Set-Content -LiteralPath (Join-Path $EvidenceRoot ($Stage + '-data.json')) -Encoding utf8
    $json | ConvertFrom-Json
}
function Invoke-PhotoCases {
    $sourceHashes = @{}
    foreach ($name in @('transparent.png','photo.jpg')) { $sourceHashes[$name] = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot ('Fixtures/' + $name)) -Algorithm SHA256).Hash.ToLowerInvariant() }
    Invoke-ProfilePhotoCases $sourceHashes
    $script:CurrentCase = 'PHOTO-02-gallery-cancel'
    Go-To 'Photos'
    Foreground-OwnedApp
    Invoke-Control 'AddPhoto'
    Pick-SyntheticFile 'transparent.png'
    $null = Wait-Control 'PhotoCaption'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'PhotoCaption'
    $state = Photo-State 'gallery-cancel'
    if (@($state.photos).Count -ne 0 -or @($state.managedFiles | Where-Object { $_.path -like 'photos*' }).Count -ne 0) { throw 'Canceled gallery dialog committed a photo or staged gallery file.' }
    Receipt $script:CurrentCase 'Real picker selection followed by gallery dialog cancel left no photo row, original or thumbnail.'

    $script:CurrentCase = 'PHOTO-02-gallery-save-hashes'
    foreach ($name in @('transparent.png','photo.jpg')) {
        Foreground-OwnedApp
        Invoke-Control 'AddPhoto'
        Pick-SyntheticFile $name
        Set-Text 'PhotoCaption' ('Synthetic ' + $name)
        Invoke-Control 'DialogSave'
        Wait-Absent 'PhotoCaption'
    }
    $state = Photo-State 'gallery-save'
    if (@($state.photos).Count -ne 2) { throw 'Two gallery saves did not persist two photo rows.' }
    foreach ($photo in $state.photos) {
        $original = $state.files | Where-Object { $_.path -eq $photo.file_path }
        $thumbnail = $state.files | Where-Object { $_.path -eq $photo.thumbnail_path }
        Assert-GalleryPhoto $photo $original $thumbnail $sourceHashes

    }
    $savedHashes = ($state.files | Sort-Object path | ForEach-Object { $_.path + ':' + $_.sha256 }) -join '|'
    Receipt $script:CurrentCase 'PNG/JPEG real picker saves persisted athlete1 rows, exact original SHA256/size600x300 and decoded PNG thumbnails300x150; all file hashes recorded.'

    $script:CurrentCase = 'PHOTO-05-viewer-navigation'
    Open-Row 'PhotoRow2'
    Assert-Text 'ViewerCaption' '1 / 2 · Synthetic photo.jpg'
    Invoke-Control 'ViewerPrevious'
    Assert-Text 'ViewerCaption' '2 / 2 · Synthetic transparent.png'
    Invoke-Control 'ViewerNext'
    Assert-Text 'ViewerCaption' '1 / 2 · Synthetic photo.jpg'
    Set-ViewerPosition 2
    Assert-Text 'ViewerCaption' '2 / 2 · Synthetic transparent.png'
    Invoke-Control 'ViewerClose'
    Wait-Absent 'ViewerClose'
    # Reopen uses the viewer's real Loaded focus; CommandBar buttons own arrow keys.
    Open-Row 'PhotoRow1'
    Assert-Text 'ViewerCaption' '2 / 2 · Synthetic transparent.png'
    Send-OwnedKey '{RIGHT}'
    Assert-Text 'ViewerCaption' '1 / 2 · Synthetic photo.jpg'
    Send-OwnedKey '{ESC}'
    Wait-Absent 'ViewerClose'
    Receipt $script:CurrentCase 'Native gallery viewer passed wrapping previous/next, direct index2, focused Right arrow and Escape close.'

    Invoke-GalleryDeletionCases $savedHashes $sourceHashes

}

function Test-PickerOwner($candidate, [IntPtr]$mainHandle) {
    if ($candidate.Current.NativeWindowHandle -eq $script:Window.Current.NativeWindowHandle) { return $false }
    $handle = [IntPtr]::new($candidate.Current.NativeWindowHandle)
    $owner = [LoikkaPickerOwnership]::GetWindow($handle, 4)
    $owned = $candidate.Current.ProcessId -eq $script:AppProcess.Id
    for ($level = 0; $level -lt 8 -and $owner -ne [IntPtr]::Zero; $level++) {
        if ($owner -eq $mainHandle) { $owned = $true; break }
        $owner = [LoikkaPickerOwnership]::GetWindow($owner, 4)
    }
    return $owned
}

function Set-SyntheticPickerFile($picker, [string]$FileName, [bool]$EvidenceJson, [bool]$Save) {
    $fixturePath = Resolve-SyntheticPickerPath $FileName $EvidenceJson
    $filenameId = if ($Save) { 'FileNameControlHost' } else { '1148' }
    $fileCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $filenameId)
    $fileControl = $picker.FindAll([System.Windows.Automation.TreeScope]::Descendants, $fileCondition) |
        Where-Object { $_.Current.ControlType -in @([System.Windows.Automation.ControlType]::ComboBox,[System.Windows.Automation.ControlType]::Edit) } | Select-Object -First 1
    if (-not $fileControl) { throw "Owned picker has no filename control $filenameId; see metadata-only picker-controls.json." }
    $value = $null
    if ($fileControl.Current.ControlType -ne [System.Windows.Automation.ControlType]::Edit) {
        $editCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
        $fileControl = $fileControl.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
        if (-not $fileControl) { throw 'Owned filename control exposes no editable child.' }
    }
    $value = $fileControl.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    $fileControl.SetFocus()
    $value.SetValue($fixturePath)
    $null = Wait-Until { $value.Current.Value -eq $fixturePath } 'synthetic full path in native picker filename edit'
    $openCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1')
    $openButton = Wait-Until { $picker.FindAll([System.Windows.Automation.TreeScope]::Descendants, $openCondition) |
        Where-Object { $_.Current.ClassName -eq 'Button' } | Select-Object -First 1 } 'owned picker native commit Button1'
    [ordered]@{ id = $openButton.Current.AutomationId; name = $openButton.Current.Name; class = $openButton.Current.ClassName; enabled = $openButton.Current.IsEnabled; focusable = $openButton.Current.IsKeyboardFocusable; hwnd = $openButton.Current.NativeWindowHandle; patterns = @($openButton.GetSupportedPatterns() | ForEach-Object ProgrammaticName) } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'picker-commit-control.json') -Encoding utf8
    $null = Wait-Until { $openButton.Current.IsEnabled } 'enabled native picker commit button'
    $invoke = $null
    if ($openButton.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) { $invoke.Invoke() }
    else {
        $commitHandle = [IntPtr]::new($openButton.Current.NativeWindowHandle)
        if ($commitHandle -eq [IntPtr]::Zero -or $openButton.Current.ClassName -ne 'Button') { throw 'Owned picker commit has neither Invoke nor a native Button HWND.' }
        if (-not [LoikkaPickerOwnership]::PostMessage($commitHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)) { throw 'Could not click owned native picker commit button.' }
    }
}

function Resolve-SyntheticPickerPath([string]$FileName, [bool]$EvidenceJson) {
    $fixtureDirectory = if ($EvidenceJson) { $EvidenceRoot } else { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'Fixtures')) }
    $fixturePath = [IO.Path]::GetFullPath((Join-Path $fixtureDirectory $FileName))
    if (-not $fixturePath.StartsWith($fixtureDirectory.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Picker path must stay inside its synthetic fixture directory.' }
    if ($EvidenceJson) {
        if ([IO.Path]::GetExtension($fixturePath) -ne '.json') { throw 'Only generated acceptance JSON files are allowed in this mode.' }
    }
    elseif (-not (Test-Path -LiteralPath $fixturePath)) { throw 'Only committed synthetic UiTests/Fixtures images are allowed.' }
    return $fixturePath
}

function Invoke-ProfilePhotoCases($sourceHashes) {
    $script:CurrentCase = 'ATH-02-picker-cancel'
    Go-To 'Athletes'
    Invoke-Control 'AddAthlete'
    Set-Text 'AthleteFirstName' 'Kuva'
    Set-Text 'AthleteLastName' 'Synteettinen'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    Open-Row 'AthleteRow1'
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Valitse profiilikuva'
    Pick-SyntheticFile -Cancel
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-picker-cancel'
    if ($state.athletes[0].photo_path -or @($state.managedFiles).Count -ne 0) { throw 'Canceled picker changed the profile link or created managed files.' }
    Receipt $script:CurrentCase 'Real owned Windows file picker canceled without profile writes.'

    $script:CurrentCase = 'ATH-02-profile-preview-cancel'
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Valitse profiilikuva'
    Pick-SyntheticFile 'transparent.png'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-preview-cancel'
    if ($state.athletes[0].photo_path -or @($state.managedFiles).Count -ne 0) { throw 'Canceled selected profile preview committed a link or managed file.' }
    Receipt $script:CurrentCase 'Selected synthetic PNG in real picker; canceling editor left no link or managed files.'

    $script:CurrentCase = 'ATH-02-profile-save'
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Valitse profiilikuva'
    Pick-SyntheticFile 'transparent.png'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-save'
    $profilePng = $state.athletes[0].photo_path
    if (-not $profilePng -or $state.files[0].sha256 -ne $sourceHashes['transparent.png']) { throw 'Committed profile does not retain original PNG bytes.' }
    Receipt $script:CurrentCase 'Real picker saved profile; persisted managed original SHA256 equals synthetic source.'

    $script:CurrentCase = 'ATH-02-profile-view'
    Invoke-Name 'Näytä urheilijan profiilikuva'
    Assert-Text 'ViewerCaption' '1 / 1 · Kuva Synteettinen'
    if (Find-Control 'ViewerDelete') { throw 'Read-only profile viewer exposes gallery deletion.' }
    Invoke-Control 'ViewerClose'
    Wait-Absent 'ViewerClose'
    Receipt $script:CurrentCase 'Committed profile opened in the native single-image viewer without delete command.'

    $script:CurrentCase = 'ATH-02-profile-replace-cancel-save'
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Valitse profiilikuva'
    Pick-SyntheticFile 'photo.jpg'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-replace-cancel'
    if ($state.athletes[0].photo_path -ne $profilePng) { throw 'Canceled replacement changed the profile link.' }
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Valitse profiilikuva'
    Pick-SyntheticFile 'photo.jpg'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-replace-save'
    $profileJpeg = $state.athletes[0].photo_path
    if (-not $profileJpeg -or $profileJpeg -eq $profilePng -or $state.files[0].sha256 -ne $sourceHashes['photo.jpg']) { throw 'Saved JPEG replacement link or original hash is incorrect.' }
    Receipt $script:CurrentCase 'Canceled replacement retained PNG; saved replacement committed a different managed JPEG path with exact source hash.'

    $script:CurrentCase = 'ATH-02-profile-remove-restart'
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Poista profiilikuva'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    $state = Photo-State 'profile-remove-cancel'
    if ($state.athletes[0].photo_path -ne $profileJpeg) { throw 'Canceled removal changed the profile link.' }
    Invoke-Control 'EditAthlete'
    Invoke-Name 'Poista profiilikuva'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    Stop-OwnedApp
    Start-OwnedApp
    Go-To 'Athletes'
    Open-Row 'AthleteRow1'
    $state = Photo-State 'profile-remove-restart'
    if ($state.athletes[0].photo_path) { throw 'Removed profile link returned after restart.' }
    Receipt $script:CurrentCase 'Removal cancel preserved link; save and native restart retained null profile. Old managed profile files follow the retention policy.'
}

function Assert-GalleryPhoto($photo, $original, $thumbnail, $sourceHashes) {
    if ($photo.entity_type -ne 'athletes' -or $photo.entity_id -ne 1 -or $photo.width -ne 600 -or $photo.height -ne 300 -or
        -not $original -or $original.sha256 -ne $sourceHashes[$photo.original_name] -or $photo.size_bytes -ne $original.length -or
        -not $thumbnail -or $thumbnail.pngWidth -ne 300 -or $thumbnail.pngHeight -ne 150) { throw 'Gallery owner, source bytes, dimensions, size or PNG thumbnail metadata differ from fixtures.' }
}

function Invoke-GalleryDeletionCases($savedHashes, $sourceHashes) {
    $script:CurrentCase = 'PHOTO-05-delete-cancel-restart'
    Open-Row 'PhotoRow1'
    Assert-Text 'ViewerCaption' '2 / 2 · Synthetic transparent.png'
    Invoke-Control 'ViewerDelete'
    Invoke-Control 'ConfirmCancel'
    Wait-Absent 'ConfirmAccept'
    $state = Photo-State 'gallery-delete-cancel'
    if (@($state.photos).Count -ne 2 -or (($state.files | Sort-Object path | ForEach-Object { $_.path + ':' + $_.sha256 }) -join '|') -ne $savedHashes) { throw 'Canceled viewer deletion changed photo rows or hashes.' }
    Invoke-Control 'ViewerClose'
    Wait-Absent 'ViewerClose'
    Stop-OwnedApp
    Start-OwnedApp
    Go-To 'Photos'
    $state = Photo-State 'gallery-restart'
    if (@($state.photos).Count -ne 2 -or (($state.files | Sort-Object path | ForEach-Object { $_.path + ':' + $_.sha256 }) -join '|') -ne $savedHashes) { throw 'Photo rows or original/thumbnail hashes changed across native restart.' }
    Receipt $script:CurrentCase 'Canceled viewer deletion and native restart retained both rows and all original/thumbnail hashes.'

    $script:CurrentCase = 'PHOTO-05-delete-confirm-last'
    Open-Row 'PhotoRow1'
    Invoke-Control 'ViewerDelete'
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'ConfirmAccept'
    Assert-Text 'ViewerCaption' '1 / 1 · Synthetic photo.jpg'
    $state = Photo-State 'gallery-delete-one'
    if (@($state.photos).Count -ne 1 -or $state.photos[0].id -ne 2 -or @($state.managedFiles | Where-Object { $_.path -like 'photos*' }).Count -ne 2) { throw 'Confirmed deletion did not remove only the chosen row, original and thumbnail.' }
    Invoke-Control 'ViewerDelete'
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'ViewerClose'
    Assert-WindowText 'Ei kuvia valituilla suodattimilla.'
    Stop-OwnedApp
    Start-OwnedApp
    Go-To 'Photos'
    $state = Photo-State 'gallery-empty-restart'
    if (@($state.photos).Count -ne 0 -or @($state.managedFiles | Where-Object { $_.path -like 'photos*' }).Count -ne 0) { throw 'Last-photo deletion left a row, gallery original or thumbnail after restart.' }
    foreach ($name in $sourceHashes.Keys) {
        if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot ('Fixtures/' + $name)) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceHashes[$name]) { throw 'External synthetic source image changed.' }
    }
    Receipt $script:CurrentCase 'Confirmed single and last-photo deletion removed managed originals/thumbnails and rows; empty gallery survived restart; both external fixture hashes unchanged.'
}

try {
    if ($RegressionOnly) { . (Join-Path $PSScriptRoot 'RegressionCases.ps1'); Initialize-RegressionFixture }
    if ($WorkloadOnly) { . (Join-Path $PSScriptRoot 'WorkloadCases.ps1'); Initialize-SyntheticWorkload }
    $script:LaunchTimer = [Diagnostics.Stopwatch]::StartNew()
    Start-OwnedApp
    if ($PhotosOnly) { Invoke-PhotoCases }
    elseif ($LocalToolsOnly) { . (Join-Path $PSScriptRoot 'LocalToolsCases.ps1'); Invoke-LocalToolsCases }
    elseif ($WorkloadOnly) { Invoke-WorkloadCases }
    elseif ($RegressionOnly) { Invoke-RegressionCases }
    else {
    $script:CurrentCase = 'UI-01'
    foreach ($page in @('Dashboard','Athletes','Results','Calendar','Statistics','Goals','Photos','Settings')) {
        Go-To $page
        Receipt 'UI-01' "Native page $page is reachable through UI Automation."
    }
    $script:CurrentCase = 'ATH-01-create-cancel'
    Go-To 'Athletes'
    Invoke-Control 'AddAthlete'
    Set-Text 'AthleteFirstName' 'Peruttu'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    $null = Wait-Until { (Find-Control 'AddAthlete').Current.HasKeyboardFocus } 'focus restored to AddAthlete after dialog close'
    Assert-WindowText 'Ei vielä urheilijoita. Lisää ensimmäinen urheilija.'
    if (Find-Control 'AthleteRow1') { throw 'Canceled athlete form created a row.' }
    Receipt $script:CurrentCase 'Cancel left the empty list unchanged.'

    $script:CurrentCase = 'ATH-01-create'
    Invoke-Control 'AddAthlete'
    Invoke-Control 'DialogSave'
    $null = Wait-Control 'AthleteFirstName'
    Set-Text 'AthleteFirstName' '  Synteettinen  '
    Set-Text 'AthleteLastName' '  Testaaja  '
    Select-Choice 'AthleteBirthYear' '2013'
    Set-Text 'AthleteClub' 'Testiseura'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    Assert-Text 'AthleteRow1' 'Synteettinen Testaaja'
    Assert-Text 'AthleteRow1' 'Testiseura'
    Receipt $script:CurrentCase (Control-Text 'AthleteRow1')

    $script:CurrentCase = 'ATH-01-edit'
    Open-Row 'AthleteRow1'
    $null = Wait-Control 'PageAthleteDetail'
    Invoke-Control 'EditAthlete'
    Set-Text 'AthleteClub' 'Peruttu seura'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'AthleteFirstName'
    Invoke-Control 'EditAthlete'
    if ((Text-Pattern 'AthleteClub').Current.Value -ne 'Testiseura') { throw 'Canceled athlete edit changed club.' }
    Set-Text 'AthleteClub' 'Uusi testiseura'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    Go-To 'Athletes'
    Assert-Text 'AthleteRow1' 'Uusi testiseura'
    Receipt $script:CurrentCase 'Canceled edit preserved the club; committed edit refreshed the list.'

    $script:CurrentCase = 'RES-02-time-create'
    Go-To 'Results'
    Invoke-Control 'AddResult'
    Select-Choice 'ResultDiscipline' '100 m'
    Set-Text 'ResultValue_seconds' '12'
    Set-Text 'ResultValue_hundredths' '34'
    Set-Text 'ResultCompetition' 'Synteettiset kisat'
    Set-Text 'ResultLocation' 'Testikenttä'
    Set-Text 'ResultPlacement' '1'
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    Assert-Text 'ResultRow1' '12.34'
    $expectedDate = [datetime]::Today.ToString('d.M.yyyy')
    Assert-Text 'ResultRow1' $expectedDate
    Receipt $script:CurrentCase (Control-Text 'ResultRow1')

    $script:CurrentCase = 'RES-04-status-edit'
    Open-Row 'ResultRow1'
    Select-Choice 'ResultStatus' 'DNS - Ei startannut'
    Invoke-Control 'StatusChangeCancel'
    Wait-Absent 'StatusChangeConfirm'
    if ((Text-Pattern 'ResultValue_seconds').Current.Value -ne '12' -or
        (Text-Pattern 'ResultValue_hundredths').Current.Value -ne '34' -or
        (Text-Pattern 'ResultPlacement').Current.Value -ne '1') { throw 'Canceled status transition cleared the numeric result or placement.' }
    Receipt 'RES-04-status-cancel' 'Canceled nonvalid transition retained 12.34 and placement1.'
    Select-Choice 'ResultStatus' 'DNS - Ei startannut'
    Invoke-Control 'StatusChangeConfirm'
    Wait-Absent 'StatusChangeConfirm'
    if ((Text-Pattern 'ResultValue_seconds').Current.Value -ne '' -or
        (Text-Pattern 'ResultValue_hundredths').Current.Value -ne '' -or
        (Text-Pattern 'ResultPlacement').Current.Value -ne '') { throw 'Confirmed nonvalid transition did not clear the numeric input and placement.' }
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    Assert-Text 'ResultRow1' 'DNS'
    Receipt $script:CurrentCase (Control-Text 'ResultRow1')

    $script:CurrentCase = 'STAT-01-native-chart'
    Invoke-Control 'AddResult'
    Select-Choice 'ResultDiscipline' '100 m'
    Set-Text 'ResultValue_seconds' '12'
    Set-Text 'ResultValue_hundredths' '50'
    Set-Text 'ResultCompetition' 'Kaavion testikilpailu'
    Set-Text 'ResultPlacement' '2'
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    Assert-Text 'ResultRow2' '12.50'
    Go-To 'Statistics'
    Assert-WindowText 'Paras 12.50 · Keskiarvo 12.50 · Kilpailuja 1'
    Assert-WindowText 'Kausivertailu'
    $chartCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, 'Kaavion arvot aikajärjestyksessä')
    $null = Wait-Until { $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $chartCondition).Count -eq 2 } 'both native line and season-bar accessible data lists'
    Receipt $script:CurrentCase 'Valid 12.50 result loaded native Statistics, line/PB chart and season bars with two accessible data lists; pixel geometry is unverified.'

    $script:CurrentCase = 'ATH-04-five-tabs'
    Go-To 'Athletes'
    Open-Row 'AthleteRow1'
    foreach ($tabName in @('Ennätykset','Tulokset','Mitalit','Kehitys','Tavoitteet')) {
        Select-Tab $tabName
        switch ($tabName) {
            'Tulokset' { Assert-Text 'DetailResult2' '12.50' }
            'Mitalit' { $null = Wait-Control 'Medal2' }
            'Kehitys' {
                Assert-WindowText 'Valitse laji nähdäksesi kehityksen.'
                Select-Choice 'AthleteDiscipline' '100 m'
                Assert-WindowText 'Tuloksia 1 · Keskiarvo 12.50 · Kehitys –'
            }
            'Tavoitteet' { Assert-WindowText 'Lisää tavoite' }
        }
        Receipt $script:CurrentCase "Native athlete tab $tabName selected and its scoped content loaded."
    }

    $script:CurrentCase = 'CAL-03-participant-deselection'
    Go-To 'Athletes'
    Go-To 'Calendar'
    Invoke-Control 'AddCompetition'
    Set-Text 'CompetitionName' 'Osallistujatestit'
    (Wait-Control 'CompetitionParticipant1').GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle()
    Select-ListChoice 'CompetitionEvents1' '100 m'
    Invoke-Control 'DialogSave'
    Wait-Absent 'CompetitionName'
    Open-Row 'CompetitionRow1'
    $events = Wait-Control 'CompetitionEvents1'
    $chosen = $events.GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection()
    if ($chosen.Count -ne 1) { throw 'Competition did not restore the one planned discipline.' }
    $chosen[0].GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).RemoveFromSelection()
    (Wait-Control 'CompetitionShowAll1').GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle()
    $null = Wait-Until { (Wait-Control 'CompetitionEvents1').GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection().Count -eq 0 } 'deselected event to remain absent after show-all refresh'
    (Wait-Control 'CompetitionShowAll1').GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle()
    $null = Wait-Until { (Wait-Control 'CompetitionEvents1').GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection().Count -eq 0 } 'deselected event to remain absent after age-filter refresh'
    Invoke-Control 'DialogSave'
    Wait-Absent 'CompetitionName'
    Open-Row 'CompetitionRow1'
    if ((Wait-Control 'CompetitionEvents1').GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection().Count -ne 0) { throw 'Saving restored a discipline that the user deselected.' }
    Invoke-Control 'DialogCancel'
    Wait-Absent 'CompetitionName'
    Receipt $script:CurrentCase 'Planned100m round-tripped; deselection survived show-all/age filters, save and reopen.'

    $script:CurrentCase = 'RES-03-date-change'
    Go-To 'Athletes'
    Go-To 'Results'
    Open-Row 'ResultRow1'
    $targetDay = if ([datetime]::Today.Day -eq 15) { 14 } else { 15 }
    $changedDate = [datetime]::new([datetime]::Today.Year, [datetime]::Today.Month, $targetDay)
    Set-CalendarDate $changedDate
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    $expectedDate = $changedDate.ToString('d.M.yyyy')
    Assert-Text 'ResultRow1' $expectedDate
    Receipt $script:CurrentCase "Native date control changed the result date to $expectedDate."
    $script:CurrentCase = 'RES-03-valid-date-retains-value'
    Open-Row 'ResultRow2'
    Set-CalendarDate $changedDate
    if ((Text-Pattern 'ResultValue_seconds').Current.Value -ne '12' -or
        (Text-Pattern 'ResultValue_hundredths').Current.Value -ne '50') { throw 'Changing the date of a valid result cleared its existing 12.50 numeric input.' }
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    Assert-Text 'ResultRow2' '12.50'
    Assert-Text 'ResultRow2' $expectedDate
    Receipt $script:CurrentCase 'Valid result date changed without losing 12.50.'

    $script:CurrentCase = 'restart'
    Stop-OwnedApp
    Start-OwnedApp
    Go-To 'Athletes'
    Assert-Text 'AthleteRow1' 'Synteettinen Testaaja'
    Assert-Text 'AthleteRow1' 'Uusi testiseura'
    Go-To 'Results'
    Assert-Text 'ResultRow1' 'DNS'
    Assert-Text 'ResultRow1' $expectedDate
    Assert-Text 'ResultRow2' '12.50'
    Receipt $script:CurrentCase 'Athlete edit, result status and changed dates survived native close/reopen.'

    $script:CurrentCase = 'RES-10-selection-delete-cancel'
    $row = Wait-Control 'ResultRow1'
    $row.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    (Wait-Control 'ResultRow2').GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).AddToSelection()
    Invoke-Control 'DeleteSelectedResults'
    Invoke-Control 'ConfirmCancel'
    Wait-Absent 'ConfirmAccept'
    Assert-Text 'ResultRow1' 'DNS'
    Assert-Text 'ResultRow2' '12.50'
    Receipt $script:CurrentCase 'Canceled deletion retained the selected result.'
    $script:CurrentCase = 'RES-10-selection-delete'
    Invoke-Control 'DeleteSelectedResults'
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'ResultRow1'
    Assert-WindowText 'Ei tuloksia valituilla suodattimilla.'
    Receipt $script:CurrentCase 'Confirmed selected-row deletion refreshed the actual native result list.'

    $script:CurrentCase = 'ATH-08-delete'
    Go-To 'Athletes'
    Open-Row 'AthleteRow1'
    Invoke-Control 'DeleteAthlete'
    Invoke-Control 'ConfirmCancel'
    Wait-Absent 'ConfirmAccept'
    $null = Wait-Control 'PageAthleteDetail'
    Invoke-Control 'DeleteAthlete'
    Invoke-Control 'ConfirmAccept'
    $null = Wait-Control 'PageAthletes'
    Wait-Absent 'AthleteRow1'
    Stop-OwnedApp
    Start-OwnedApp
    Go-To 'Athletes'
    Assert-WindowText 'Ei vielä urheilijoita. Lisää ensimmäinen urheilija.'
    Wait-Absent 'AthleteRow1'
    Go-To 'Results'
    Assert-WindowText 'Ei tuloksia valituilla suodattimilla.'
    Wait-Absent 'ResultRow1'
    Receipt $script:CurrentCase 'Athlete cancel/confirm and deleted-state restart passed on synthetic data.'
    }
}
catch {
    $script:Failure = $_.Exception.Message
    $script:FailureStack = $_.ScriptStackTrace
    $script:Receipts.Add([ordered]@{ case = $script:CurrentCase; status = 'fail'; detail = $script:Failure; time = [datetime]::UtcNow.ToString('o') })
    Capture-Failure
    Write-Output "FAIL $script:CurrentCase $script:Failure"
}
finally {
    Stop-OwnedApp
    $databasePath = Join-Path $DataRoot 'loikka.db'
    [ordered]@{
        executable = $Executable; executableSha256 = (Get-FileHash -LiteralPath $Executable -Algorithm SHA256).Hash
        artifactIdentity = $script:ArtifactIdentity
        dataRoot = $DataRoot; startedAt = $script:StartedAt; completedAt = [datetime]::UtcNow.ToString('o')
        os = [Environment]::OSVersion.VersionString; powershell = $PSVersionTable.PSVersion.ToString()
        ownedProcessIds = $script:OwnedProcesses.ToArray(); failure = $script:Failure
        failureStack = $script:FailureStack
        lastProcessExitCode = $(if ($script:AppProcess -and $script:AppProcess.HasExited) { $script:AppProcess.ExitCode } else { $null })
        screenshot = 'Not captured; foreground or occlusion is not established. UIA evidence only.'
        databaseSha256 = $(if (Test-Path -LiteralPath $databasePath) { (Get-FileHash -LiteralPath $databasePath -Algorithm SHA256).Hash } else { $null })
        cases = $script:Receipts.ToArray()
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'receipt.json') -Encoding utf8
    Write-Output "Synthetic root: $DataRoot"
    Write-Output "Evidence root: $EvidenceRoot"
}
if ($script:Failure) { throw $script:Failure }
