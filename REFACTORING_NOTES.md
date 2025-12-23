# Rust-koodin refaktorointi

## Tehty (23.12.2024)

### google_drive.rs → google_drive/ moduuli

Alkuperäinen 1190-rivinen `google_drive.rs` (41 KB) jaettu modulaariseksi rakenteeksi:

```
src-tauri/src/google_drive/
├── mod.rs      - Re-exportit, julkinen API
├── types.rs    - Tyyppimäärittelyt (GoogleCredentials, StoredTokens, DriveFile...)
├── tokens.rs   - Token-hallinta (load, save, refresh, validate)
├── oauth.rs    - OAuth2-flow (auth URL, callback, code exchange)
├── api.rs      - Drive API -operaatiot (kansiot, upload, download, delete)
└── sync.rs     - Synkronointi ja palautus (database, photos)
```

**Status:** ✅ Valmis, `cargo check` läpi ilman virheitä/varoituksia.

---

## Tekemättä

### 1. results.rs refaktorointi (suositus)

`src-tauri/src/commands/results.rs` on 38 KB - voisi jakaa:

```
src-tauri/src/commands/results/
├── mod.rs      - Re-exportit
├── crud.rs     - Create, Read, Update, Delete
├── records.rs  - SE/KE-laskenta (personal/season best)
└── queries.rs  - Monimutkaiset kyselyt
```

### 2. Testit (ei kiireellinen)

Projektissa ei ole testejä. Voisi lisätä:
- `src-tauri/src/google_drive/` moduuleille yksikkötestit
- Frontend: Vitest + React Testing Library
- E2E: Playwright

### 3. Dokumentaatiotiedostot (siistiminen)

Juuressa 6 markdown-tiedostoa - voisi siirtää `docs/`-kansioon:
- CLAUDE.md
- UI_SPEC.md
- THEME_SPEC.md
- CODE_ANALYSIS.md
- DATABASE_ANALYSIS.md
- REVIEW_REPORT.md

### 4. Turha tiedosto

Poista juuresta: `nul` (80 tavua, tyhjä/turha)

---

## Komennot

```bash
# Tarkista käännös
cd src-tauri && cargo check

# Rakenna sovellus
npm run tauri build

# Kehityspalvelin
npm run tauri dev
```
