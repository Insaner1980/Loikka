# Loikka WinUI: käyttö ja julkaisu

Loikka tarvitsee Windows 11:n ja x64-ympäristön. Käytä `global.json`-tiedoston .NET SDK:ta. Koonti- ja testikomennot ovat projektin README-tiedostossa.

## Käynnistys ja tietohakemisto

Release-sovelluksen oletustietohakemisto on `%LOCALAPPDATA%\Loikka.Native.Beta`. Tietokanta, mediat, asetukset ja palautuskopiot kuuluvat tietohakemistoon, eivät asennushakemistoon. Saman aineiston samanaikainen käyttö estetään tietohakemiston sisarpolun `<root>.instance.lock`-lukolla.

Testaa aina uudella eristetyllä hakemistolla:

```powershell
$testRoot = Join-Path $env:TEMP ('Loikka-test-' + [Guid]::NewGuid().ToString('N'))
& './native/Loikka.App/bin/x64/Release/net10.0-windows10.0.26100.0/win-x64/Loikka.App.exe' --data-root $testRoot
```

Oikean sovelluksen UI-testit on kuvattu tiedostossa `native/Loikka.UiTests/README.md`. Testiaineisto luodaan synteettisesti; käyttäjän tietoja ei käytetä testeissä.

## Julkaisu ja asennin

Sovellus tarvitsee koko self-contained-julkaisuhakemiston sisältöineen.

```powershell
dotnet publish native/Loikka.App/Loikka.App.csproj -c Release -r win-x64 -p:Platform=x64 -p:SelfContained=true -p:WindowsAppSDKSelfContained=true -p:PublishSingleFile=false -p:PublishTrimmed=false -p:DebugSymbols=false -p:DebugType=None -o .native-artifacts/publish/win-x64

./installer/Build-NativeInstaller.ps1 -PublishDirectory .native-artifacts/publish/win-x64 -OutputDirectory .native-artifacts/installer -ValidateOnly

./installer/Build-NativeInstaller.ps1 -PublishDirectory .native-artifacts/publish/win-x64 -OutputDirectory .native-artifacts/installer -MakeNsis C:/Tools/NSIS/makensis.exe
```

NSIS-polku on esimerkki: anna oman NSIS-kääntäjäsi polku. `-ValidateOnly` tarkistaa julkaisutiedostot, mutta ei luo eikä asenna pakettia. Rakennusskripti tarkistaa ajonaikaiset pääkomponentit, torjuu kehityssymbolit ja tunnetut yksityiset tiedostot sekä kirjoittaa tiedostokohtaisen SHA-256-manifestin.

Asennin asentaa nykyiselle käyttäjälle hakemistoon `%LOCALAPPDATA%\Programs\Loikka.Native.Beta`. Asennuksenpoisto säilyttää käyttäjän tietohakemiston ja varmuuskopiot. Asennuspaketin tarkistukset on ajettava uudelleen, kun paketti rakennetaan; lähdekoodin testit eivät varmista uuden asennuspaketin toimintaa.

## Tiedot ja Google Drive

JSON-vienti sisältää urheilijat, kilpailut, tulokset, tavoitteet ja mitalit. Se ei ole täydellinen varmuuskopio: säilytä myös SQLite-tietokanta, mediat ja asetukset. JSON-tuonti validoi viitteet, ottaa ennakkokopion ja tekee päivitykset transaktiona.

Google Drive -toiminnot lukevat `oauth-client.json`-asetukset sovelluksen asennushakemistosta vasta pilvitoimintoa käytettäessä. Tunnuksia tai käyttäjäaineistoa ei saa lisätä Git-repoon. Paikalliset toiminnot eivät edellytä Google-kirjautumista. Automaattiset Drive-testit käyttävät simuloituja palvelinvastauksia; oikean tilin OAuth-käyttö on erillinen tarkistus.

Tietokannan siirtotestien riippumattomat SQL-aineistot ovat hakemistossa `native/Loikka.Tests/Fixtures`. Älä korvaa niiden odotuksia sovelluksen nykyisellä skeemalla: niiden tarkoitus on havaita tietojen säilymiseen liittyvät regressiot.

## Todennuksen rajat

Sonar-ajoon kuuluvat Release-koonti, molemmat .NET-testiprojektit sekä neljä WinUI-testisarjaa kattavuusraportteineen. Ajo vaatii interaktiivisen Windows-työpöydän ja Node 24:n. Raportit tallentuvat `reports/sonar-test-results/`-hakemistoon.

Kohdennetut UI-testit eivät yksin todista koko saavutettavuutta, kaikkia näyttö- ja tekstiskaaloja, puhtaan koneen asennusta tai oikean Google-tilin toimintaa. Testaa nämä erikseen ennen niiden hyväksymistä.
