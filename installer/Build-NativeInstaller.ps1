[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$PublishDirectory,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [string]$MakeNsis,
    [ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version = '1.0.0',
    [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'
$publishRoot = (Resolve-Path -LiteralPath $PublishDirectory).Path
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
if ($outputRoot.StartsWith($publishRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or $outputRoot -eq $publishRoot) { throw 'Output must be separate from the publish directory.' }
$entries = @(Get-ChildItem -LiteralPath $publishRoot -Recurse -Force)
if ($entries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Publish directory contains reparse points.' }
$files = @($entries | Where-Object { -not $_.PSIsContainer })
foreach ($name in @('Loikka.App.exe', 'Loikka.App.dll', 'Loikka.App.pri', 'Assets\AppIcon.ico', 'Assets\Help.json', 'Loikka.Infrastructure.dll', 'Loikka.Core.dll', 'Loikka.App.runtimeconfig.json', 'Microsoft.UI.Xaml.dll', 'coreclr.dll', 'e_sqlite3.dll')) {
    if (-not (Test-Path -LiteralPath (Join-Path $publishRoot $name))) { throw "Self-contained publish is incomplete: $name is missing." }
}
foreach ($file in $files) {
    if ($file.Name -match '(?i)(tokens?|credentials|\.db(?:-|\.|$)|\.pfx$|\.p12$|\.pem$|\.key$|^\.env)' -or $file.Extension -eq '.pdb') { throw "Publish contains a private/development file: $($file.Name)" }
}
$manifest = @($files | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = [IO.Path]::GetRelativePath($publishRoot, $_.FullName); bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
})
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$manifestPath = Join-Path $outputRoot 'publish-manifest.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding utf8
$uninstallPath = Join-Path $outputRoot 'uninstall-files.nsh'
$uninstall = [Collections.Generic.List[string]]::new()
foreach ($file in $files) {
    $relative = [IO.Path]::GetRelativePath($publishRoot, $file.FullName).Replace('$', '$$')
    $uninstall.Add('Delete "$INSTDIR\' + $relative + '"')
}
foreach ($directory in @($entries | Where-Object PSIsContainer | Sort-Object { $_.FullName.Length } -Descending)) {
    $relative = [IO.Path]::GetRelativePath($publishRoot, $directory.FullName).Replace('$', '$$')
    $uninstall.Add('RMDir "$INSTDIR\' + $relative + '"')
}
$uninstall | Set-Content -LiteralPath $uninstallPath -Encoding utf8
if ($ValidateOnly) { Write-Output "Validated $($files.Count) publish files; manifest: $manifestPath"; return }
if (-not $MakeNsis) { $MakeNsis = (Get-Command makensis.exe -ErrorAction SilentlyContinue).Source }
if (-not $MakeNsis -or -not (Test-Path -LiteralPath $MakeNsis)) { throw 'NSIS compiler not found. Pass -MakeNsis with a verified portable or installed compiler path.' }
$outputFile = Join-Path $outputRoot "Loikka.Native.Beta-$Version-x64-setup.exe"
& $MakeNsis '/V3' '/WX' '/INPUTCHARSET' 'UTF8' "/DPUBLISH_DIR=$publishRoot" "/DOUTPUT_FILE=$outputFile" "/DUNINSTALL_FILES=$uninstallPath" "/DPRODUCT_VERSION=$Version" (Join-Path $PSScriptRoot 'Loikka.Native.Beta.nsi')
if ($LASTEXITCODE -ne 0) { throw "NSIS failed with exit code $LASTEXITCODE." }
if (-not (Test-Path -LiteralPath $outputFile)) { throw 'NSIS did not create the installer.' }
Get-FileHash -LiteralPath $outputFile -Algorithm SHA256
