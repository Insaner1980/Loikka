param([Parameter(Mandatory)][string]$Executable, [Parameter(Mandatory)][string]$DataRoot, [Parameter(Mandatory)][string]$EvidenceRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class LoikkaWindowCheck {
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct MINMAXINFO { public POINT Reserved,MaxSize,MaxPosition,MinTrack,MaxTrack; }
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd, out RECT rect);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x,int y,int cx,int cy,uint flags);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd,uint msg,IntPtr w,ref MINMAXINFO info);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint process);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
}
'@
if (Test-Path -LiteralPath $DataRoot) { throw 'Use a new synthetic root.' }
$null=New-Item -ItemType Directory -Path $DataRoot
$null=New-Item -ItemType Directory -Path $EvidenceRoot
$taskCases=[Collections.Generic.List[object]]::new()
$taskProcess=$null; $taskWindow=$null; $taskFailure=$null
$taskDpiContext=[LoikkaWindowCheck]::SetThreadDpiAwarenessContext([IntPtr](-4))
function Wait-Check([scriptblock]$Probe) {
 $deadline=[datetime]::UtcNow.AddSeconds(20)
 do { $answer=& $Probe; if($answer){return $answer}; if($taskProcess.HasExited){throw 'Owned native process exited.'}; Start-Sleep -Milliseconds 100 } while([datetime]::UtcNow -lt $deadline)
 throw 'UIA condition timed out.'
}
function Find-Id([string]$Id) {
 if(-not $taskWindow){return $null}
 $condition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty,$Id)
 $taskWindow.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$condition)
}
function Assert-OwnWindow {
 [uint32]$owner=0; [void][LoikkaWindowCheck]::GetWindowThreadProcessId($taskHandle,[ref]$owner)
 if($owner -ne $taskProcess.Id){throw 'Target is not the owned native window.'}
}
function Send-OwnKeys([string]$Keys) {
 Assert-OwnWindow
 [void][LoikkaWindowCheck]::SetForegroundWindow($taskHandle)
 $null=Wait-Check { [LoikkaWindowCheck]::GetForegroundWindow() -eq $taskHandle }
 [Windows.Forms.SendKeys]::SendWait($Keys)
}
function Receipt([string]$Case,[object]$Detail) { $taskCases.Add([ordered]@{case=$Case;status='pass';detail=$Detail}) }
try {
 $taskProcess=Start-Process -FilePath $Executable -ArgumentList ('--data-root "'+$DataRoot+'"') -PassThru
 $taskCondition=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty,$taskProcess.Id)
 $taskWindow=Wait-Check { [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children,$taskCondition) }
 $taskHandle=[IntPtr]$taskWindow.Current.NativeWindowHandle
 $null=Wait-Check { Find-Id 'PageDashboard' }
 Assert-OwnWindow
 $taskDpi=[LoikkaWindowCheck]::GetDpiForWindow($taskHandle)
 $taskScale=$taskDpi/96.0
 $taskRect=New-Object LoikkaWindowCheck+RECT
 [void][LoikkaWindowCheck]::GetClientRect($taskHandle,[ref]$taskRect)
 $taskInitial=@($taskRect.Right,$taskRect.Bottom)
 $taskOuter=New-Object LoikkaWindowCheck+RECT
 [void][LoikkaWindowCheck]::GetWindowRect($taskHandle,[ref]$taskOuter)
 $taskFrameWidth=$taskOuter.Right-$taskOuter.Left-$taskRect.Right
 $taskFrameHeight=$taskOuter.Bottom-$taskOuter.Top-$taskRect.Bottom
 $taskWork=[Windows.Forms.Screen]::FromHandle($taskHandle).WorkingArea
 $taskExpectedWidth=[Math]::Min([Math]::Ceiling(1200*$taskScale),$taskWork.Width-$taskFrameWidth)
 $taskExpectedHeight=[Math]::Min([Math]::Ceiling(800*$taskScale),$taskWork.Height-$taskFrameHeight)
 if($taskRect.Right -ne $taskExpectedWidth -or $taskRect.Bottom -ne $taskExpectedHeight){throw "Unexpected initial client dimensions: $taskInitial at DPI $taskDpi"}
 if($taskOuter.Left -lt $taskWork.Left -or $taskOuter.Top -lt $taskWork.Top -or $taskOuter.Right -gt $taskWork.Right -or $taskOuter.Bottom -gt $taskWork.Bottom){throw 'Initial window extends outside the monitor work area.'}
 $taskMin=New-Object LoikkaWindowCheck+MINMAXINFO
 [void][LoikkaWindowCheck]::SendMessage($taskHandle,0x24,[IntPtr]::Zero,[ref]$taskMin)
 $taskExpectedMinimumWidth=[Math]::Min([Math]::Ceiling(800*$taskScale)+$taskFrameWidth,$taskWork.Width)
 $taskExpectedMinimumHeight=[Math]::Min([Math]::Ceiling(600*$taskScale)+$taskFrameHeight,$taskWork.Height)
 if($taskMin.MinTrack.X -ne $taskExpectedMinimumWidth -or $taskMin.MinTrack.Y -ne $taskExpectedMinimumHeight){throw 'Minimum track size does not match the monitor-clamped minimum.'}
 [void][LoikkaWindowCheck]::SetWindowPos($taskHandle,[IntPtr]::Zero,0,0,$taskMin.MinTrack.X,$taskMin.MinTrack.Y,0x16)
 Start-Sleep -Milliseconds 250
 [void][LoikkaWindowCheck]::GetClientRect($taskHandle,[ref]$taskRect)
 if($taskRect.Right -ne $taskExpectedMinimumWidth-$taskFrameWidth -or $taskRect.Bottom -ne $taskExpectedMinimumHeight-$taskFrameHeight){throw 'Minimum client area does not match the monitor-clamped minimum.'}
 Receipt 'UI-02-current-DPI-initial-minimum' ([ordered]@{dpi=$taskDpi;scale=$taskScale;initialClient=$taskInitial;workArea=@($taskWork.X,$taskWork.Y,$taskWork.Width,$taskWork.Height);nonClientFrame=@($taskFrameWidth,$taskFrameHeight);minimumTrack=@($taskMin.MinTrack.X,$taskMin.MinTrack.Y);minimumClient=@($taskRect.Right,$taskRect.Bottom);initialSizeScope='1200x800 effective initial and 800x600 minimum client size, each clamped to the actual monitor work area including the nonclient frame.';otherDpiOrTextScaleTested=$false})
 $taskPages=@('Dashboard','Athletes','Results','Calendar','Statistics','Goals','Photos','Settings')
 for($i=0;$i -lt $taskPages.Count;$i++) {
  (Find-Id 'NavDashboard').SetFocus()
  Send-OwnKeys ([string]($i+1))
  $taskExpected='Page'+$taskPages[$i]
  $null=Wait-Check { Find-Id $taskExpected }
 }
 Receipt 'UI-03-number-navigation' 'Actual key presses 1 through 8 reached all eight native pages at minimum size.'
 (Find-Id 'NavAthletes').SetFocus(); Send-OwnKeys '2'
 $null=Wait-Check { Find-Id 'PageAthletes' }
 (Find-Id 'NavAthletes').SetFocus(); Send-OwnKeys '^u'
 $taskFirst=Wait-Check { Find-Id 'AthleteFirstName' }
 $taskSave=Wait-Check { $taskSaveButton=Find-Id 'PrimaryButton'; if($taskSaveButton -and -not $taskSaveButton.Current.IsOffscreen -and $taskSaveButton.Current.IsEnabled){$taskSaveButton} }
 $taskFirst.SetFocus(); Send-OwnKeys '12345678'; Send-OwnKeys '^u'
 $taskValue=$taskFirst.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
 if($taskValue -ne '12345678' -or -not(Find-Id 'PageAthletes')){throw 'Typing triggered navigation or lost form data.'}
 Send-OwnKeys '{ESC}'
 $null=Wait-Check { -not(Find-Id 'AthleteFirstName') }
 Receipt 'UI-03-add-typing-escape' 'Ctrl+U opens the athlete form; 1-8 and Ctrl+U inside text input retain context; Escape cancels; Save remains reachable at minimum size.'
 $taskWindowPattern=$taskWindow.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
 foreach($taskState in @([System.Windows.Automation.WindowVisualState]::Maximized,[System.Windows.Automation.WindowVisualState]::Normal,[System.Windows.Automation.WindowVisualState]::Minimized,[System.Windows.Automation.WindowVisualState]::Normal)) {
  Assert-OwnWindow; $taskWindowPattern.SetWindowVisualState($taskState)
  $null=Wait-Check { $taskWindowPattern.Current.WindowVisualState -eq $taskState }
 }
 Receipt 'UI-02-caption-states' 'Native maximize/restore/minimize/restore states passed through UIA WindowPattern.'
} catch { $taskFailure=$_.Exception.Message; $taskCases.Add([ordered]@{case='window-keyboard-check';status='fail';detail=$taskFailure}) }
finally {
 if($taskProcess -and -not $taskProcess.HasExited) { $taskProcess.Refresh(); [void]$taskProcess.CloseMainWindow(); if(-not $taskProcess.WaitForExit(10000)){Stop-Process -Id $taskProcess.Id -Force; $taskProcess.WaitForExit()} }
 [void][LoikkaWindowCheck]::SetThreadDpiAwarenessContext($taskDpiContext)
 [ordered]@{executable=$Executable;dllSha256=(Get-FileHash (Join-Path (Split-Path $Executable) 'Loikka.App.dll')).Hash;priSha256=(Get-FileHash (Join-Path (Split-Path $Executable) 'Loikka.App.pri')).Hash;os=[Environment]::OSVersion.VersionString;textScaleFactor=([Windows.UI.ViewManagement.UISettings,Windows.UI.ViewManagement,ContentType=WindowsRuntime]::new()).TextScaleFactor;dataRoot=$DataRoot;ownedPid=$taskProcess.Id;processExited=$taskProcess.HasExited;failure=$taskFailure;cases=$taskCases.ToArray()} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'receipt.json') -Encoding utf8
 Get-Content -LiteralPath (Join-Path $EvidenceRoot 'receipt.json')
}
if($taskFailure){throw $taskFailure}
