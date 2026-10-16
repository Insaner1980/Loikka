# Loaded by Invoke-NativeAcceptance.ps1 against a fresh marked synthetic root.
function Initialize-RegressionFixture {
    & node (Join-Path $PSScriptRoot '../../tests/migration/create-reference.mjs') --output $DataRoot | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'fixture.json') -Encoding utf8
    if ($LASTEXITCODE) { throw 'Could not create the regression fixture.' }
    $setup = @'
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const root=process.argv[2];if(!fs.existsSync(path.join(root,'.uia-synthetic-root')))throw Error('Synthetic marker required');
const db=new DatabaseSync(path.join(root,'loikka.db'));
db.exec("UPDATE results SET date='2026-01-01',value=13 WHERE id=130; UPDATE results SET date='2026-02-01',value=14 WHERE id=131;");
const row={...db.prepare('SELECT * FROM results WHERE id=3').get(),id:700,athlete_id:4,value:0,status:'dnf',placement:null,sub_results:null,combined_event_id:null};
db.prepare(`INSERT INTO results (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));db.close();
'@
    $setupPath = Join-Path $EvidenceRoot 'prepare-regression.cjs'
    $setup | Set-Content -LiteralPath $setupPath -Encoding utf8
    & node $setupPath $DataRoot
    if ($LASTEXITCODE) { throw 'Could not prepare regression boundary rows.' }
}
function Regression-Contains([string]$Text) {
    $null = Wait-Until {
        $script:Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition) |
            Where-Object { $_.Current.Name.Contains($Text) } | Select-Object -First 1
    } "regression content: $Text" 5
}
function Assert-RegressionNoError {
    $errorText = Find-Control 'Message'
    if ($errorText -and $errorText.Current.Name) { throw ('Unexpected page error: ' + $errorText.Current.Name) }
}
function Regression-Keys([string]$Keys) {
    Add-Type -AssemblyName System.Windows.Forms
    Foreground-OwnedApp
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
}
function Regression-FocusInViewer {
    $focus = [System.Windows.Automation.AutomationElement]::FocusedElement
    $trace = @()
    for ($e = $focus; $e; $e = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($e)) {
        $trace += $e.Current.AutomationId
        if ($e.Current.AutomationId -like 'Viewer*') { return ($trace -join '/') }
        if ($e.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window) { break }
    }
    if ($focus.Current.AutomationId -eq 'MoreButton') { return 'Viewer overflow' }
    [ordered]@{id=$focus.Current.AutomationId;name=$focus.Current.Name;class=$focus.Current.ClassName;type=$focus.Current.ControlType.ProgrammaticName;ancestors=$trace} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'unexpected-viewer-focus.json') -Encoding utf8
    throw "Viewer focus escaped to $($focus.Current.AutomationId) $($focus.Current.Name)."
}
function Invoke-RegressionCases {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class LoikkaRegressionWindow {
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd,out RECT r);
 [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hwnd,ref POINT p);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr p);
}
'@
    $dpiContext = [LoikkaRegressionWindow]::SetThreadDpiAwarenessContext([IntPtr](-4))
    $beforeHash = (Get-FileHash -LiteralPath (Join-Path $DataRoot 'loikka.db')).Hash
    try {
        Assert-InitialWorkArea
        $script:Window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).SetWindowVisualState([System.Windows.Automation.WindowVisualState]::Maximized)
        $script:CurrentCase = 'F02-athlete-initial-selection'
        Go-To 'Athletes'; Open-Row 'AthleteRow1'; $null = Wait-Control 'AthleteDiscipline'
        Select-Tab 'Ennätykset'; Assert-RegressionNoError
        Receipt $script:CurrentCase 'Initial and explicit athlete tab selection have no page error.'
        $script:CurrentCase = 'F01-progress-lazy-chart'
        Select-Tab 'Kehitys'; Regression-Contains 'Valitse laji nähdäksesi kehityksen'
        if (-not $script:AppProcess.Responding) { throw 'Progress page stopped responding.' }
        Select-Choice 'AthleteDiscipline' '100 m'; Regression-Contains 'Tuloksia 11'; Assert-RegressionNoError
        Receipt $script:CurrentCase 'The full 54-event fixture opens progress without eagerly creating all charts; selected 100m has 11 valid points.'
        $script:CurrentCase = 'F07-progress-comparison'
        Regression-Contains 'Kausien vertailu'; Regression-Contains '2025: 13.50'
        Invoke-Control 'BackToAthletes'; Open-Row 'AthleteRow2'; $null = Wait-Control 'AthleteDiscipline'
        Select-Choice 'AthleteDiscipline' '100 m'; Select-Tab 'Kehitys'
        Regression-Contains 'Kehitys +1.00 s (heikentynyt)'
        Receipt $script:CurrentCase '13 to 14 seconds is explicitly worse; athlete progress includes its own season comparison.'
        $script:CurrentCase = 'F08-combined-breakdown'
        Go-To 'Results'; Select-Choice 'ResultDisciplineFilter' '3-ottelu'; $null = Wait-Control 'ResultRow200'
        foreach ($part in @('40 m: 7.65 · 200 p','Pituus: 345 cm · 300 p','Kuula: 6.78 m · 400 p')) { Regression-Contains $part }
        Open-Row 'ResultRow200'; $null = Wait-Control 'ResultAthlete'
        $breakdown = Wait-Until { Find-Control 'CombinedBreakdown' } 'combined editor breakdown' 4
        if (-not $breakdown.Current.Name.Contains('400 p')) { throw 'Combined editor omitted subevent points.' }
        Invoke-Control 'DialogCancel'; Wait-Absent 'ResultAthlete'
        Receipt $script:CurrentCase 'Stored subevent values and 200/300/400 points are shown in the list and read-only editor breakdown.'
        $script:CurrentCase = 'F10-clear-results-filters'
        Select-Choice 'ResultAthleteFilter' 'Aino Esimerkki'; Select-Choice 'ResultTypeFilter' 'Kilpailu'; Select-Choice 'ResultSeasonFilter' '2026'; Select-Choice 'ResultAgeFilter' 'T13'
        Invoke-Control 'ClearResultFilters'
        foreach ($id in @('ResultAthleteFilter','ResultDisciplineFilter','ResultTypeFilter','ResultSeasonFilter','ResultAgeFilter')) {
            $selected = (Wait-Control $id).GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection()
            if (-not $selected[0].Current.Name.StartsWith('Kaikki')) { throw "Filter $id was not cleared." }
        }
        Receipt $script:CurrentCase 'One command clears all five filters.'
        $script:CurrentCase = 'F09-goal-status-filter'
        Go-To 'Goals'; Select-Choice 'GoalStatusFilter' 'Saavutetut'; $null = Wait-Control 'AchievedGoal3'
        if (Find-Control 'GoalRow1') { throw 'Active goals remain in achieved-only view.' }
        Select-Choice 'GoalStatusFilter' 'Aktiiviset'; $null = Wait-Control 'GoalRow1'
        if (Find-Control 'AchievedGoal3') { throw 'Achieved goals remain in active-only view.' }
        Select-Choice 'GoalStatusFilter' 'Kaikki'; $null = Wait-Control 'GoalRow1'
        Receipt $script:CurrentCase 'Active, achieved-only and all goals are selectable without losing stored statuses.'
        $script:CurrentCase = 'F11-valid-statistics-options'
        Go-To 'Statistics'; Select-Choice 'StatsAthlete' 'Nuori Näyte'
        Regression-Contains 'Ei tuloksia valitulle urheilijalle.'
        foreach ($id in @('StatsDiscipline','StatsSeason')) {
            if ((Wait-Control $id).GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection().Count -ne 0) { throw "Invalid-only results populated $id." }
        }
        Receipt $script:CurrentCase 'A DNF-only athlete has no eligible event/year choices.'
        $script:CurrentCase = 'F06-calendar-key-scope'
        Go-To 'Calendar'
        $calendarCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Calendar)
        $calendar = Wait-Until { $script:Window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $calendarCondition) } 'calendar view'
        $dayCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::DataItem)
        # Any visible day exercises shortcut scope; its name may include "today".
        $day = Wait-Until { $calendar.FindAll([System.Windows.Automation.TreeScope]::Descendants, $dayCondition) |
            Where-Object { $_.Current.IsEnabled -and -not $_.Current.IsOffscreen -and $_.Current.IsKeyboardFocusable } | Select-Object -First 1 } 'focusable calendar day'
        $day.SetFocus()
        $null = Wait-Until { ([System.Windows.Automation.AutomationElement]::FocusedElement).Equals($day) } 'calendar day keyboard focus'
        Regression-Keys '1'
        if (-not (Find-Control 'PageCalendar')) { throw 'Number key navigated away from the focused calendar.' }
        Receipt $script:CurrentCase 'Calendar day focus retains its page when 1 is typed.'
        Invoke-ViewerKeyboardRegression
        if ((Get-FileHash -LiteralPath (Join-Path $DataRoot 'loikka.db')).Hash -ne $beforeHash) { throw 'Read/cancel regressions mutated the synthetic database.' }
    } finally { [void][LoikkaRegressionWindow]::SetThreadDpiAwarenessContext($dpiContext) }
}

function Invoke-ViewerKeyboardRegression() {
    $script:CurrentCase = 'F03-viewer-tab-scope'
    Go-To 'Photos'; Open-Row 'PhotoRow1'; $null = Wait-Control 'ViewerClose'
    $trace = @()
    foreach ($keys in @('{TAB}','+{TAB}')) {
        (Wait-Control 'ViewerClose').SetFocus()
        for ($i=0;$i -lt 14;$i++) { Regression-Keys $keys; $trace += Regression-FocusInViewer }
    }
    $trace | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'viewer-keyboard.json') -Encoding utf8
    Regression-Keys '{ESC}'; Wait-Absent 'ViewerClose'
    Receipt $script:CurrentCase '28 forward/reverse Tab steps remain in the viewer; Escape closes it.'
}

function Assert-InitialWorkArea {
    $script:CurrentCase = 'F04-startup-workarea'
    $handle = [IntPtr]$script:Window.Current.NativeWindowHandle
    $area = [Windows.Forms.Screen]::FromHandle($handle).WorkingArea
    $client = New-Object LoikkaRegressionWindow+RECT; $point = New-Object LoikkaRegressionWindow+POINT
    [void][LoikkaRegressionWindow]::GetClientRect($handle,[ref]$client)
    [void][LoikkaRegressionWindow]::ClientToScreen($handle,[ref]$point)
    if ($point.X -lt $area.Left -or $point.Y -lt $area.Top -or $point.X+$client.Right -gt $area.Right -or $point.Y+$client.Bottom -gt $area.Bottom) { throw 'Initial app client extends outside the monitor work area.' }
    Receipt $script:CurrentCase 'Initial client fits the real monitor work area.'
}
