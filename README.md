# Loikka

Loikka on WinUI 3- ja .NET 10 -työpöytäsovellus yleisurheilutulosten seurantaan. Sovellus tarvitsee Windows 11:n ja x64-ympäristön. SDK-versio on tiedostossa `global.json` ja keskitetyt NuGet-versiot tiedostossa `Directory.Packages.props`.

## Koonti ja testit

Aja projektin juurihakemistossa:

```powershell
dotnet restore Loikka.slnx
dotnet build Loikka.slnx -c Release -p:Platform=x64
dotnet test native/Loikka.Tests/Loikka.Tests.csproj -c Release
dotnet test native/Loikka.UiTests/Loikka.UiTests.csproj -c Release
node --test tests/migration/reference-fixture.test.mjs
```

Node 24 tarvitaan vain synteettisen testiaineiston luontiin ja UI-automaation SQLite-tarkistuksiin.

## SonarQube

`sonar -PlanOnly` näyttää paikallisen analyysiskriptin vaiheet ilman ajoa tai lähetystä. PowerShell-profiilin `sonar`-komento ajaa Release/x64-koonnin, molemmat .NET-testiprojektit kattavuusraportteineen ja lähettää tulokset [Loikan SonarQube-projektiin](https://sonarcloud.io/project/overview?id=Insaner1980_Loikka). Profiili lataa tallennetun Sonar-tunnisteen istunnon ajaksi. Suora kutsu on `./tools/sonar.ps1 -AllowExternalUpload`, ja se edellyttää `SONAR_TOKEN`-ympäristömuuttujaa.

Työkaluversiot ovat `.config/dotnet-tools.json`-tiedostossa. Lokit tallentuvat `reports/sonar.txt`-tiedostoon ja ajokohtaiset XML-/TRX-raportit `reports/sonar-test-results/`-kansioon. Skripti käyttää [Sonarin tukemaa dotnet-coverage XML -muotoa](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/dotnet-test-coverage). Se ajaa myös sovelluksen neljä UI-testisarjaa (oletus, paikalliset työkalut, kuvat ja regressiot) eristetyillä synteettisillä aineistoilla ja kerää niiden kattavuuden. Ajo edellyttää interaktiivista Windows-työpöytää ja Node 24:ää. Node-migraatiotesti ajetaan erikseen. Lähetyksen onnistuminen ei yksin vahvista palvelimen Quality Gate -tulosta.

## Rakenne ja käyttö

- `native/Loikka.App`: WinUI-käyttöliittymä.
- `native/Loikka.Core`: tietomallit, säännöt ja lajitiedot.
- `native/Loikka.Infrastructure`: SQLite, migraatiot, kuvat ja Google Drive.
- `native/Loikka.Tests` ja `native/Loikka.UiTests`: .NET-testit, vertailuaineistot ja UI-automaatio.
- `tests/migration`: synteettisen aineiston generaattori ja sen testit.
- `installer`: nykyisen käyttäjän EXE-asennin.

Käyttö-, julkaisu- ja palautusohjeet ovat tiedostossa [WINUI3_NATIVE_RUNBOOK.md](docs/WINUI3_NATIVE_RUNBOOK.md). Oikean sovelluksen UI-testien komennot ovat tiedostossa [native/Loikka.UiTests/README.md](native/Loikka.UiTests/README.md).
