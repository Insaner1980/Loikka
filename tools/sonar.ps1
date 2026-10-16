#Requires -Version 5.1

[CmdletBinding()]
param(
    [switch]$PlanOnly,
    [switch]$AllowExternalUpload
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding

function Invoke-DotNetCommand {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $commandOutput = & dotnet @Arguments 2>&1
        $commandExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    $commandOutput | ForEach-Object {
        ([string]$_).Replace($env:SONAR_TOKEN, '[REDACTED_SECRET]')
    } | Tee-Object -FilePath $reportPath -Append | Out-Host
    if ($commandExitCode -ne 0) {
        throw "dotnet-komento epäonnistui (exit $commandExitCode)."
    }
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$reportsDir = Join-Path $projectRoot 'reports'
$reportPath = Join-Path $reportsDir 'sonar.txt'
$projectKey = 'Insaner1980_Loikka' # Public project identifier, not a credential. gitleaks:allow
$organization = 'insaner1980'
$projectUrl = "https://sonarcloud.io/project/overview?id=$projectKey"
$testProjects = @('Loikka.Tests', 'Loikka.UiTests')

if ($PlanOnly) {
    Write-Output @(
        'sonar'
        '  - dotnet tool restore + solution restore + Release/x64 build'
        '  - Loikka.Tests + Loikka.UiTests with VS Coverage XML and TRX reports'
        '  - SonarQube Cloud upload; requires SONAR_TOKEN and -AllowExternalUpload'
        '  - Native UI acceptance (default, local tools, photos and regression) with coverage'
        '  - Requires an interactive Windows desktop; Node migration tests are separate checks'
        "  - project: $projectKey"
        "  - organization: $organization"
        "  - results: $projectUrl"
        "  - report: $reportPath"
        '  - coverage and test results: reports/sonar-test-results/<run-id>/'
    )
    exit 0
}

if (-not $AllowExternalUpload) {
    throw 'Sonar-analyysi lähettää analyysituloksen SonarQube Cloudiin. Käytä -AllowExternalUpload.'
}
if ([string]::IsNullOrWhiteSpace($env:SONAR_TOKEN)) {
    throw 'SONAR_TOKEN ei ole asetettu tälle PowerShell-istunnolle.'
}

# A separate directory per run prevents stale coverage from being uploaded.
$resultsRelativePath = 'reports/sonar-test-results/' + [Guid]::NewGuid().ToString('N')
$testResultsDir = Join-Path $projectRoot $resultsRelativePath
New-Item -ItemType Directory -Force -Path $testResultsDir | Out-Null
Set-Content -LiteralPath $reportPath -Encoding utf8 -Value @(
    'sonar'
    "Root: $projectRoot"
    "Project: $projectKey"
    "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    "Test results: $testResultsDir"
    ''
)

Push-Location -LiteralPath $projectRoot
try {
    Invoke-DotNetCommand -Arguments @('tool', 'restore')
    Invoke-DotNetCommand -Arguments @('restore', 'Loikka.slnx', '-p:Platform=x64')
    Invoke-DotNetCommand -Arguments @(
        'tool', 'run', 'dotnet-sonarscanner', '--', 'begin'
        "/k:$projectKey"
        "/o:$organization"
        '/d:sonar.host.url=https://sonarcloud.io'
        "/d:sonar.token=$env:SONAR_TOKEN"
        "/d:sonar.cs.vstest.reportsPaths=$resultsRelativePath/*.trx"
        "/d:sonar.cs.vscoveragexml.reportsPaths=$resultsRelativePath/*.xml"
        '/d:sonar.scanner.scanAll=false'
        '/d:sonar.exclusions=**/bin/**,**/obj/**,reports/**,native/Loikka.App/Assets/**'
    )
    Invoke-DotNetCommand -Arguments @(
        'build', 'Loikka.slnx', '-c', 'Release', '-p:Platform=x64'
        '--no-restore', '--no-incremental', '-m:1'
    )
    foreach ($testProject in $testProjects) {
        $coveragePath = Join-Path $testResultsDir "$testProject.xml"
        # The solution maps the test projects to AnyCPU, even for its x64 build.
        $testCommand = "dotnet test native/$testProject/$testProject.csproj -c Release -p:Platform=AnyCPU --no-build --no-restore --results-directory $resultsRelativePath --logger trx;LogFileName=$testProject.trx"
        Invoke-DotNetCommand -Arguments @(
            'tool', 'run', 'dotnet-coverage', '--', 'collect', $testCommand
            '-f', 'xml', '-o', $coveragePath
        )
        if (-not (Test-Path -LiteralPath $coveragePath -PathType Leaf)) {
            throw "Kattavuusraportti puuttuu: $testProject. Analyysia ei lähetetty."
        }
        [xml]$coverage = Get-Content -LiteralPath $coveragePath -Raw
        if ($coverage.DocumentElement.Name -ne 'results' -or
            $null -eq $coverage.SelectSingleNode('/results/modules/module')) {
            throw "Virheellinen VS Coverage XML -raportti: $testProject. Analyysia ei lähetetty."
        }
        $trxPath = Join-Path $testResultsDir "$testProject.trx"
        [xml]$testResults = Get-Content -LiteralPath $trxPath -Raw
        $counters = $testResults.TestRun.ResultSummary.Counters
        if ($null -eq $counters -or [int]$counters.executed -le 0 -or
            [int]$counters.failed -ne 0 -or $testResults.TestRun.ResultSummary.outcome -ne 'Completed') {
            throw "Testiajo ei onnistunut: $testProject. Analyysia ei lähetetty."
        }
    }
    $appExecutable = Join-Path $projectRoot 'native/Loikka.App/bin/x64/Release/net10.0-windows10.0.26100.0/win-x64/Loikka.App.exe'
    foreach ($mode in @('Default', 'LocalToolsOnly', 'PhotosOnly', 'RegressionOnly')) {
        $uiRoot = Join-Path $testResultsDir "ui-$mode"
        $dataRoot = Join-Path $uiRoot 'data'
        $evidenceRoot = Join-Path $uiRoot 'evidence'
        $modeArgument = if ($mode -eq 'Default') { '' } else { " -$mode" }
        $uiCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File native/Loikka.UiTests/Invoke-NativeAcceptance.ps1 -Executable `"$appExecutable`" -DataRoot `"$dataRoot`" -EvidenceRoot `"$evidenceRoot`"$modeArgument"
        $previousModulePath = $env:PSModulePath
        try {
            # The collector launches Windows PowerShell indirectly, so PowerShell 7
            # cannot remove its incompatible module paths for the child process.
            $env:PSModulePath = Join-Path $env:WINDIR 'System32/WindowsPowerShell/v1.0/Modules'
            Invoke-DotNetCommand -Arguments @(
                'tool', 'run', 'dotnet-coverage', '--', 'collect', $uiCommand
                '-f', 'xml', '-o', (Join-Path $testResultsDir "Ui-$mode.xml")
            )
        }
        finally {
            $env:PSModulePath = $previousModulePath
        }
        $receipt = Get-Content -LiteralPath (Join-Path $evidenceRoot 'receipt.json') -Raw | ConvertFrom-Json
        if ($receipt.failure -or @($receipt.cases).Count -eq 0 -or
            @($receipt.cases | Where-Object status -ne 'pass').Count -gt 0) {
            throw "UI-testi epäonnistui: $mode. Analyysia ei lähetetty."
        }
        [xml]$uiCoverage = Get-Content -LiteralPath (Join-Path $testResultsDir "Ui-$mode.xml") -Raw
        $appCoverage = $uiCoverage.SelectSingleNode('/results/modules/module[@name="Loikka.App.dll"]')
        if ($null -eq $appCoverage -or [int]$appCoverage.lines_covered -le 0) {
            throw "Sovelluksen UI-kattavuus puuttuu: $mode. Analyysia ei lähetetty."
        }
    }
    Invoke-DotNetCommand -Arguments @(
        'tool', 'run', 'dotnet-sonarscanner', '--', 'end'
        "/d:sonar.token=$env:SONAR_TOKEN"
    )
}
finally {
    Pop-Location
}

Write-Output "Tulokset palvelimen käsittelyn jälkeen: $projectUrl"
