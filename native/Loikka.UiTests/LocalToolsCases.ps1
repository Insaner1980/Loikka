# Loaded by Invoke-NativeAcceptance.ps1 only for its isolated synthetic root.
function Local-State([string]$Stage) {
    $reader = @'
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const root=process.argv[1];if(!fs.existsSync(path.join(root,'.uia-synthetic-root')))throw Error('synthetic marker missing');
const db=new DatabaseSync(path.join(root,'loikka.db'),{readOnly:true});
const result={};for(const table of ['athletes','results','competitions','goals','medals','competition_participants','photos','notes'])result[table]=db.prepare(`select * from ${table} order by id`).all();
db.close();const pref=path.join(root,'native-preferences.json');result.preferences=fs.existsSync(pref)?JSON.parse(fs.readFileSync(pref,'utf8')):{};
console.log(JSON.stringify(result));
'@
    $json = & node -e $reader $DataRoot
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic SQLite verification failed.' }
    $json | Set-Content -LiteralPath (Join-Path $EvidenceRoot ($Stage + '-data.json')) -Encoding utf8
    $json | ConvertFrom-Json
}
function Assert-LocalEqual($Before, $After, [string]$Description) {
    if (($Before | ConvertTo-Json -Depth 30 -Compress) -ne ($After | ConvertTo-Json -Depth 30 -Compress)) { throw $Description }
}
function Set-SyntheticWriteFault([string]$Table = 'none', [switch]$Remove) {
    $writer = @'
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const [root,table,remove]=process.argv.slice(1);if(!fs.existsSync(path.join(root,'.uia-synthetic-root')))throw Error('synthetic marker missing');
if(!['results','goals','none'].includes(table))throw Error('unexpected test table');
const db=new DatabaseSync(path.join(root,'loikka.db'));db.exec('DROP TRIGGER IF EXISTS uia_write_fault');
if(remove!=='true')db.exec(`CREATE TRIGGER uia_write_fault BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END`);
db.close();
'@
    & node -e $writer $DataRoot $Table $Remove.IsPresent.ToString().ToLowerInvariant()
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure the isolated SQLite fault.' }
}
function Assert-SyntheticWriteError {
    $null = Wait-Until {
        Owned-Elements | Where-Object { $_.Current.Name.Contains('synthetic write failure') } | Select-Object -First 1
    } 'honest UI error from injected SQLite write failure'
}
function Save-LocalResult([string]$Discipline, [string]$Whole, [string]$Fraction = '') {
    Go-To 'Results'
    Invoke-Control 'AddResult'
    Select-Choice 'ResultAthlete' 'Aino Synteettinen'
    Select-Choice 'ResultDiscipline' $Discipline
    if ($Discipline -eq '100 m') {
        Set-Text 'ResultValue_seconds' $Whole
        Set-Text 'ResultValue_hundredths' $Fraction
    }
    else { Set-Text 'ResultValue_whole' $Whole }
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
}
function Invoke-LocalToolsCases {
    Invoke-LocalWriteFailureCases
    Invoke-GoalInputCases
    Invoke-GoalLifecycleCases
    $script:CurrentCase = 'PHOTO-04-setup'
    Go-To 'Calendar'
    Invoke-Control 'AddCompetition'
    Set-Text 'CompetitionName' 'Kuvien synteettinen kilpailu'
    Invoke-Control 'DialogSave'
    Wait-Absent 'CompetitionName'
    Go-To 'Photos'
    Foreground-OwnedApp
    Invoke-Control 'AddPhoto'
    Pick-SyntheticFile 'transparent.png'
    Select-Choice 'PhotoAthlete' 'Aino Synteettinen'
    Set-Text 'PhotoCaption' 'Synteettinen liitoskuva'
    Invoke-Control 'DialogSave'
    Wait-Absent 'PhotoAthlete'
    $photoBefore = Photo-State 'reassign-before'
    if (@($photoBefore.photos).Count -ne 1 -or $photoBefore.photos[0].entity_type -ne 'athletes' -or $photoBefore.photos[0].entity_id -ne 1) { throw 'Reassignment fixture owner is incorrect.' }
    $originalFiles = $photoBefore.managedFiles
    Invoke-PhotoReassignmentCases $originalFiles
    $remaining = Local-State 'local-before-export'

    $script:CurrentCase = 'DATA-01-export-cancel'
    Go-To 'Settings'
    Foreground-OwnedApp
    Invoke-Control 'ExportJson'
    Pick-SyntheticFile -Cancel
    Assert-LocalEqual $remaining (Local-State 'export-cancel') 'Canceling export mutated local data.'
    Receipt $script:CurrentCase 'Actual Windows save picker canceled without mutation.'
    $script:CurrentCase = 'DATA-01-export'
    Foreground-OwnedApp
    Invoke-Control 'ExportJson'
    Pick-SyntheticFile 'local-export.json' -EvidenceJson -Save
    Assert-WindowText 'Tiedot viety onnistuneesti.'
    $exportPath = Join-Path $EvidenceRoot 'local-export.json'
    $export = Get-Content -LiteralPath $exportPath -Raw | ConvertFrom-Json
    if ($export.version -ne '1.0.0' -or @($export.athletes).Count -ne 2 -or @($export.results).Count -ne 2 -or @($export.goals).Count -ne 2) { throw 'Export contract/counts differ from stored rows.' }
    $expectedKeys = 'athletes,competitions,exportedAt,goals,medals,results,version'
    if (($export.PSObject.Properties.Name | Sort-Object) -join ',' -ne $expectedKeys) { throw 'Export contains unexpected or missing top-level collections.' }
    Assert-LocalEqual $remaining (Local-State 'export-after') 'Export mutated local data.'
    Receipt $script:CurrentCase 'Native save picker wrote version1.0.0 with exactly five entity collections and metadata; rows unchanged.'

    $script:CurrentCase = 'DATA-01-import-cancel'
    $export.athletes[0].clubName = 'JSON-testiseura'
    $export.athletes[1].birthYear = 2004
    $export.athletes[1].gender = 'P'
    $export | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'local-import.json') -Encoding utf8
    Foreground-OwnedApp
    Invoke-Control 'ImportJson'
    Pick-SyntheticFile 'local-import.json' -EvidenceJson
    Invoke-Control 'ConfirmCancel'
    Wait-Absent 'ConfirmAccept'
    Assert-LocalEqual $remaining (Local-State 'import-cancel') 'Canceling import changed local rows.'
    Receipt $script:CurrentCase 'Actual open picker read the synthetic JSON; canceling count confirmation preserved rows.'
    $script:CurrentCase = 'DATA-01-import-upsert'
    Foreground-OwnedApp
    Invoke-Control 'ImportJson'
    Pick-SyntheticFile 'local-import.json' -EvidenceJson
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'ConfirmAccept'
    Assert-WindowText 'Tiedot tuotu. Päivittyneet tiedot näkyvät kaikilla sivuilla.'
    $imported = Local-State 'import-after'
    if (@($imported.athletes).Count -ne 2 -or @($imported.results).Count -ne 2 -or @($imported.goals).Count -ne 2 -or ($imported.athletes | Where-Object id -eq 1).club_name -ne 'JSON-testiseura') { throw 'ID-upsert import changed counts or failed to update club.' }
    if (@(Get-ChildItem -LiteralPath (Join-Path $DataRoot 'backups') -Filter 'pre-import-*.db').Count -ne 1) { throw 'Import pre-action database snapshot missing.' }
    Go-To 'Athletes'
    Assert-Text 'AthleteRow1' 'JSON-testiseura'
    Receipt $script:CurrentCase 'Import updated the same athlete ID, retained result/goal counts and created pre-import snapshot; list refreshed.'

    $script:CurrentCase = 'ATH-01-historical-year-gender'
    Open-Row 'AthleteRow2'
    Invoke-Control 'EditAthlete'
    $selectedYear = (Wait-Control 'AthleteBirthYear').GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern).Current.GetSelection()
    if ($selectedYear.Count -ne 1 -or $selectedYear[0].Current.Name -ne '2004') { throw 'Historical birth year was not restored in the editor.' }
    Select-Choice 'AthleteBirthYear' '2004'
    Set-Text 'AthleteClub' 'Historiaseura'
    Invoke-Control 'DialogSave'
    Wait-Absent 'AthleteFirstName'
    Go-To 'Athletes'
    Assert-Text 'AthleteRow2' 'Historiaseura'
    $imported = Local-State 'historical-athlete-after'
    $historicalAthlete = $imported.athletes | Where-Object id -eq 2
    if ($historicalAthlete.birth_year -ne 2004 -or $historicalAthlete.gender -ne 'P') { throw 'Unrelated edit rewrote historical birth year or stored gender.' }
    Receipt $script:CurrentCase 'Imported birth2004 remained selectable; unrelated club edit preserved year2004 and stored genderP.'

    $script:CurrentCase = 'DATA-01-late-write-failure'
    $failedImport = Get-Content -LiteralPath (Join-Path $EvidenceRoot 'local-import.json') -Encoding UTF8 -Raw | ConvertFrom-Json
    $failedImport.athletes[0].clubName = 'Ei saa tallentua'
    $failedImport | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $EvidenceRoot 'failed-import.json') -Encoding utf8
    Set-SyntheticWriteFault 'goals'
    try {
        Go-To 'Settings'
        Foreground-OwnedApp
        Invoke-Control 'ImportJson'
        Pick-SyntheticFile 'failed-import.json' -EvidenceJson
        Invoke-Control 'ConfirmAccept'
        Wait-Absent 'ConfirmAccept'
        Assert-SyntheticWriteError
        Assert-LocalEqual $imported (Local-State 'import-failed-after') 'Late import failure retained earlier athlete changes.'
        Assert-LocalEqual $originalFiles (Photo-State 'import-failed-media').managedFiles 'Failed import changed media hashes.'
    }
    finally { Set-SyntheticWriteFault -Remove }
    Receipt $script:CurrentCase 'Real goal-write failure after athlete/result upserts rolled back every row; error visible, media unchanged.'

    Invoke-HelpCases
    $script:CurrentCase = 'local-tools-restart'
    Stop-OwnedApp
    Start-OwnedApp
    Assert-LocalEqual $imported (Local-State 'local-tools-restart') 'Restart changed imported records or preferences.'
    Go-To 'Athletes'
    Assert-Text 'AthleteRow1' 'JSON-testiseura'
    Go-To 'Goals'
    $null = Wait-Control 'GoalRow4'
    Wait-Absent 'GoalRow2'
    Wait-Absent 'GoalRow3'
    Receipt $script:CurrentCase 'Imported club, exact retained goal IDs, results and celebrated preferences survived native restart.'
}

function Invoke-LocalWriteFailureCases() {
    $script:CurrentCase = 'local-fixture'
    Go-To 'Athletes'
    foreach ($first in @('Aino','Bea')) {
        Invoke-Control 'AddAthlete'
        Set-Text 'AthleteFirstName' $first
        Set-Text 'AthleteLastName' 'Synteettinen'
        Select-Choice 'AthleteBirthYear' '2013'
        Invoke-Control 'DialogSave'
        Wait-Absent 'AthleteFirstName'
    }
    $null = Local-State 'initial'

    $script:CurrentCase = 'RES-02-write-failure'
    $initial = Local-State 'write-fault-before'
    Set-SyntheticWriteFault 'results'
    try {
        Go-To 'Results'
        Invoke-Control 'AddResult'
        Select-Choice 'ResultDiscipline' '100 m'
        Set-Text 'ResultValue_seconds' '13'
        Set-Text 'ResultValue_hundredths' '20'
        Invoke-Control 'DialogSave'
        Assert-SyntheticWriteError
        if ((Text-Pattern 'ResultValue_seconds').Current.Value -ne '13') { throw 'Failed save lost the editable result.' }
        Invoke-Control 'DialogCancel'
        Wait-Absent 'ResultAthlete'
        Assert-LocalEqual $initial (Local-State 'write-fault-after') 'Failed result write changed stored rows or preferences.'
    }
    finally { Set-SyntheticWriteFault -Remove }
    Receipt $script:CurrentCase 'Injected real SQLite failure stayed visible in editable form; cancel left all canonical rows/preferences unchanged.'
}

function Invoke-GoalInputCases() {
    $script:CurrentCase = 'GOAL-01-validation'
    Go-To 'Goals'
    Invoke-Control 'AddGoal'
    Assert-Text 'GoalDeadline' 'Valitse päivämäärä'
    Select-Choice 'GoalDiscipline' '100 m'
    Invoke-Control 'DialogSave'
    Assert-WindowText 'Anna positiivinen tavoite.'
    Set-Text 'ResultValue_seconds' '0'
    Set-Text 'ResultValue_hundredths' '00'
    Invoke-Control 'DialogSave'
    Assert-WindowText 'Anna positiivinen tavoite.'
    Invoke-Control 'DialogCancel'
    Wait-Absent 'GoalAthlete'
    if (@((Local-State 'invalid-goal').goals).Count -ne 0) { throw 'Invalid/canceled goal was persisted.' }
    Receipt $script:CurrentCase 'Empty and zero targets show validation; cancel persists no goal.'

    foreach ($target in @(
        @{ name = '100 m'; whole = '12'; fraction = '00'; id = 1; value = 12.0 },
        @{ name = 'Pituus'; whole = '500'; id = 2; value = 5.0 },
        @{ name = 'Cooper'; whole = '2500'; id = 3; value = 2500.0 },
        @{ name = '3-ottelu'; whole = '900'; id = 4; value = 900.0 }
    )) {
        $script:CurrentCase = 'GOAL-01-unit-' + $target.id
        Invoke-Control 'AddGoal'
        Select-Choice 'GoalAthlete' 'Aino Synteettinen'
        Select-Choice 'GoalDiscipline' $target.name
        if ($target.fraction) {
            Set-Text 'ResultValue_seconds' $target.whole
            Set-Text 'ResultValue_hundredths' $target.fraction
        }
        else { Set-Text 'ResultValue_whole' $target.whole }
        Invoke-Control 'DialogSave'
        Wait-Absent 'GoalAthlete'
        $null = Wait-Control ('GoalRow' + $target.id)
        $stored = (Local-State ('goal-' + $target.id)).goals | Where-Object id -eq $target.id
        if ($stored.target_value -ne $target.value -or $stored.target_date -or $stored.status -ne 'active') { throw 'Goal unit, optional deadline or status did not persist exactly.' }
        Receipt $script:CurrentCase ($target.name + ' target stored as ' + $target.value + ', optional date null.')
    }
    $script:CurrentCase = 'GOAL-01-filter'
    Select-Choice 'GoalAthleteFilter' 'Bea Synteettinen'
    Assert-WindowText 'Ei aktiivisia tavoitteita.'
    if (Find-Control 'GoalRow1') { throw 'Athlete filter retained another athlete goal.' }
    Select-Choice 'GoalAthleteFilter' 'Aino Synteettinen'
    $null = Wait-Control 'GoalRow1'
    Receipt $script:CurrentCase 'Athlete filter hides and restores the scoped goals.'
}

function Invoke-GoalLifecycleCases() {
    $script:CurrentCase = 'GOAL-02-time-progress'
    Save-LocalResult '100 m' '13' '20'
    Go-To 'Goals'
    Assert-Text 'GoalRow1' '50 %'
    Assert-Text 'GoalRow1' 'Jäljellä 1.20'
    Receipt $script:CurrentCase (Control-Text 'GoalRow1')
    $script:CurrentCase = 'GOAL-02-distance-progress'
    Save-LocalResult 'Pituus' '400'
    Go-To 'Goals'
    Assert-Text 'GoalRow2' '80 %'
    Assert-Text 'GoalRow2' 'Jäljellä 1.00'
    Receipt $script:CurrentCase (Control-Text 'GoalRow2')

    $script:CurrentCase = 'GOAL-03-achievement'
    Save-LocalResult '100 m' '12' '00'
    Assert-WindowText 'Tavoite saavutettu!'
    Assert-WindowText 'Aino Synteettinen: 100 m 12.00'
    Invoke-Name 'Sulje'
    $null = Wait-Until { -not (Find-Control 'CloseButton') } 'achievement dialog closed'
    $achieved = Local-State 'goal-achieved'
    $goal = $achieved.goals | Where-Object id -eq 1
    if ($goal.status -ne 'achieved' -or $goal.achieved_at -ne [datetime]::Today.ToString('yyyy-MM-dd')) { throw 'Achievement/date was not committed with result.' }
    if (@($achieved.preferences.'loikka-celebrated-goals').Count -ne 1 -or $achieved.preferences.'loikka-celebrated-goals'[0] -ne 1) { throw 'Celebration preference was not stored exactly once.' }
    Receipt $script:CurrentCase 'Saving12.00 atomically achieved goal1 and showed athlete/event/value context; celebrated ID1 persisted.'

    $script:CurrentCase = 'GOAL-04-restart-no-replay'
    Stop-OwnedApp
    Start-OwnedApp
    Assert-LocalEqual $achieved (Local-State 'achievement-restart') 'Restart changed records or celebrated IDs.'
    Go-To 'Results'
    Open-Row 'ResultRow3'
    Invoke-Control 'DialogSave'
    Wait-Absent 'ResultAthlete'
    Go-To 'Goals'
    $null = Wait-Control 'GoalAthleteFilter'
    if (Find-Control 'CloseButton') { throw 'Already celebrated achievement replayed.' }
    Receipt $script:CurrentCase 'Restart and same-value result save did not replay the stored achievement.'

    $script:CurrentCase = 'GOAL-03-delete-qualifying-result'
    Go-To 'Results'
    Open-Row 'ResultRow3'
    Invoke-Control 'DialogDelete'
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'ResultRow3'
    $afterDelete = Local-State 'qualifying-deleted'
    if (($afterDelete.goals | Where-Object id -eq 1).status -ne 'achieved' -or @($afterDelete.results).Count -ne 2) { throw 'Deleting the qualifying result changed the durable achieved contract.' }
    Receipt $script:CurrentCase 'Goal1 remained achieved after qualifying result3 was deleted; other results retained.'

    $script:CurrentCase = 'GOAL-05-delete-cancel'
    Go-To 'Goals'
    (Wait-Control 'GoalRow2').GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    (Wait-Control 'GoalRow3').GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).AddToSelection()
    $before = Local-State 'goal-delete-before'
    Invoke-Name 'Poista valitut'
    Invoke-Control 'ConfirmCancel'
    Wait-Absent 'ConfirmAccept'
    Assert-LocalEqual $before (Local-State 'goal-delete-cancel') 'Cancel goal deletion changed data.'
    Receipt $script:CurrentCase 'Canceled bulk deletion kept all canonical rows and preferences.'
    $script:CurrentCase = 'GOAL-05-delete-confirm'
    Invoke-Name 'Poista valitut'
    Invoke-Control 'ConfirmAccept'
    Wait-Absent 'GoalRow2'
    Wait-Absent 'GoalRow3'
    $remaining = Local-State 'goal-delete-confirm'
    if ((@($remaining.goals | ForEach-Object id) -join ',') -ne '1,4') { throw 'Goal deletion affected unexpected IDs.' }
    Receipt $script:CurrentCase 'Confirmed bulk deletion removed exactly goals2/3, preserving achieved1 and active4.'
}

function Invoke-HelpCases() {
    $script:CurrentCase = 'HELP-01-topics'
    Go-To 'Settings'
    Invoke-Control 'OpenHelp'
    $sections = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../Loikka.App/Assets/Help.json') -Encoding UTF8 -Raw | ConvertFrom-Json
    foreach ($section in $sections) {
        Invoke-Name $section.title
        $part = $section.content | Where-Object text | Select-Object -First 1
        Assert-WindowText $part.text
        Invoke-Name 'Takaisin aiheisiin'
    }
    Receipt $script:CurrentCase ('All ' + @($sections).Count + ' local Finnish help topics open and return to topics without browser/cloud.')
    $script:CurrentCase = 'HELP-01-search'
    Set-Text 'HelpSearch' 'ennätys'
    Invoke-Name 'Sanasto'
    Assert-WindowText 'Lyhenteet'
    Invoke-Name 'Takaisin aiheisiin'
    Set-Text 'HelpSearch' 'zzzz-no-synthetic-match-zzzz'
    Assert-WindowText 'Ei hakutuloksia.'
    Set-Text 'HelpSearch' ''
    Invoke-Name 'Sulje'
    Wait-Absent 'HelpSearch'
    Invoke-Control 'OpenHelp'
    if ((Text-Pattern 'HelpSearch').Current.Value -ne '') { throw 'Help search did not reset on reopen.' }
    Invoke-Name 'Sulje'
    Wait-Absent 'HelpSearch'
    Receipt $script:CurrentCase 'Search matched glossary, no-match feedback was explicit, closing/reopening reset search.'
}

function Invoke-PhotoReassignmentCases($originalFiles) {
    foreach ($owner in @(
        @{ label = 'Liitä urheilijaan'; target = 'Bea Synteettinen'; type = 'athletes'; id = 2 },
        @{ label = 'Liitä kilpailuun'; target = 'Kuvien synteettinen kilpailu'; type = 'competitions'; id = 1 }
    )) {
        $script:CurrentCase = 'PHOTO-04-' + $owner.type + '-cancel'
        (Wait-Control 'PhotoRow1').GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
        $beforeOwner = Local-State ('reassign-' + $owner.type + '-before')
        Invoke-Name $owner.label
        Select-Choice 'PhotoReassignTarget' $owner.target
        Invoke-Control 'DialogCancel'
        Wait-Absent 'PhotoReassignTarget'
        Assert-LocalEqual $beforeOwner (Local-State ('reassign-' + $owner.type + '-cancel')) 'Cancel changed the photo owner.'
        Receipt $script:CurrentCase 'Canceled owner change preserved every canonical row.'
        $script:CurrentCase = 'PHOTO-04-' + $owner.type + '-save'
        (Wait-Control 'PhotoRow1').GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
        Invoke-Name $owner.label
        Select-Choice 'PhotoReassignTarget' $owner.target
        Invoke-Control 'DialogSave'
        Wait-Absent 'PhotoReassignTarget'
        $reassigned = Photo-State ('reassign-' + $owner.type + '-save')
        if ($reassigned.photos[0].entity_type -ne $owner.type -or $reassigned.photos[0].entity_id -ne $owner.id) { throw 'Photo owner did not change to selected target.' }
        Assert-LocalEqual $originalFiles $reassigned.managedFiles 'Photo owner change altered media paths or hashes.'
        Receipt $script:CurrentCase 'Saved owner metadata changed to selected target; original/thumbnail paths and hashes unchanged.'
    }
}
