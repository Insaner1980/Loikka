# Loikka development instructions

## Current implementation

Loikka is a Finnish-language WinUI 3 desktop application using C#, .NET 10, Windows App SDK and SQLite. It targets Windows 11 x64 and runs unpackaged with self-contained runtime files. Inspect `global.json`, `Directory.Packages.props` and the project files for exact versions.

- `Loikka.slnx` contains the App, Core, Infrastructure, Tests and UiTests projects under `native/`.
- App owns the native shell, pages, controls and window-associated services.
- Core owns domain rules, models, formatting and embedded data.
- Infrastructure owns SQLite persistence, legacy data migration, managed media and Google Drive integration.
- `installer/Build-NativeInstaller.ps1` packages an existing self-contained publish directory with NSIS.

`tests/migration/*.mjs` requires only Node 24's built-in modules. Frozen, independent compatibility inputs live in `native/Loikka.Tests/Fixtures/LegacyV20`; do not replace them with the native production schema or catalog.

## Validation

```powershell
dotnet restore Loikka.slnx
dotnet build Loikka.slnx -c Release -p:Platform=x64
dotnet test native/Loikka.Tests/Loikka.Tests.csproj -c Release
dotnet test native/Loikka.UiTests/Loikka.UiTests.csproj -c Release
node --test tests/migration/reference-fixture.test.mjs
```

The UiTests .NET project tests native image codecs. Real application UI automation is documented separately in `native/Loikka.UiTests/README.md`. Always use a new absolute synthetic `--data-root`; never run tests against user databases, photos or installed application data. Preserve migration compatibility, photo originals and snapshot recovery behavior. Do not read credentials or perform live Google operations without explicit authorization.

## Project references

Read `README.md` and `docs/WINUI3_NATIVE_RUNBOOK.md` for current build and operational instructions. A successful build or a focused UI run does not prove all runtime, accessibility, live cloud, or installer behavior.

Follow the user's current AGENTS.md rules. Respond in Finnish, keep identifiers and code comments in English, and commit or push only when explicitly requested. Preserve unrelated work. Do not start or stop unrelated processes.
