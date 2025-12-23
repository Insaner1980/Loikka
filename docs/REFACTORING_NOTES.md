# Refaktorointi-muistiinpanot

---

# React-komponenttianalyysi

## 1. Komponenttien koot

**Kriittisen suuret (yli 700 riviä):**
| Tiedosto | Rivit | Ongelma |
|----------|-------|---------|
| ~~`ResultEditDialog.tsx`~~ | ~~789~~ → 658 | ✅ Refaktoroitu (useDisciplineFields, AutocompleteInput) |
| ~~`ResultForm.tsx`~~ | ~~770~~ → 662 | ✅ Refaktoroitu (useDisciplineFields, AutocompleteInput) |

**Suuret (400-500 riviä):**
| Tiedosto | Rivit | Kommentti |
|----------|-------|-----------|
| `ProgressTab.tsx` | 491 | Paljon Recharts-logiikkaa, kohtuullinen |
| `SyncOptionsDialog.tsx` | 456 | Google Drive -asetukset, monimutkainen |
| `Dashboard.tsx` | 464 | Useita osioita, voisi pilkkoa |
| `AthleteDetail.tsx` | 463 | Tab-näkymä + header, kohtuullinen |
| ~~`CompetitionForm.tsx`~~ | ~~452~~ → 365 | ✅ Refaktoroitu (AutocompleteInput) |

**Hyvin organisoidut pienet komponentit (alle 150 riviä):**
- UI-primitiivit: `Dialog` (89), `Spinner` (28), `Tooltip` (37), `EmptyState` (70)
- Kortit: `AthleteCard` (125), `CompetitionCard` (135), `GoalCard` (145)
- Tabit: `RecordsTab` (140), `ResultsTab` (127), `GoalsTab` (93)

---

## 2. Toistuva koodi

### 2.1 Kilpailunimen autotäydennys (3 paikkaa)

Sama logiikka esiintyy tiedostoissa:
- `ResultEditDialog.tsx:67-154`
- `ResultForm.tsx:42-148`
- `CompetitionForm.tsx:51-129`

```typescript
// Identtinen koodi kaikissa kolmessa:
const [showCompetitionSuggestions, setShowCompetitionSuggestions] = useState(false);
const [filteredCompetitionSuggestions, setFilteredCompetitionSuggestions] = useState<string[]>([]);
const competitionNameInputRef = useRef<HTMLInputElement>(null);
const competitionSuggestionsRef = useRef<HTMLDivElement>(null);

// Identtinen handleClickOutside useEffect
// Identtinen handleCompetitionNameChange
// Identtinen handleCompetitionSuggestionClick
// Identtinen suggestions dropdown JSX
```

### 2.2 Kilpailutasovalinnat (2 paikkaa)

```typescript
// ResultEditDialog.tsx:45-54 JA CompetitionForm.tsx:10-19
const competitionLevelOptions: { value: CompetitionLevel; label: string }[] = [
  { value: "seura", label: "Seuran kisat" },
  { value: "seuraottelu", label: "Seuraottelu" },
  // ... identtinen
];
```

### 2.3 Lajikategorian tarkistukset (ResultEditDialog & ResultForm)

```typescript
// Molemmissa identtinen:
const showWindField = useMemo(() => {...}, [selectedDiscipline]);
const isHurdleDiscipline = useMemo(() => {...}, [selectedDiscipline]);
const isThrowDiscipline = useMemo(() => {...}, [selectedDiscipline]);
const equipmentType = useMemo(() => {...}, [selectedDiscipline, isThrowDiscipline]);
const availableWeights = useMemo(() => {...}, [equipmentType]);
```

### 2.4 Delete-vahvistusdialogit (5+ paikkaa)

Dashboard, ResultEditDialog, Calendar, Goals, Athletes - kaikissa lähes identtinen:
```tsx
<Dialog open={deleteConfirmOpen} onClose={...} title="Poista X" maxWidth="sm">
  <p>Haluatko varmasti poistaa...?</p>
  <div className="flex justify-end gap-3">
    <button className="btn-secondary">Peruuta</button>
    <button className="btn-primary">Poista</button>
  </div>
</Dialog>
```

### 2.5 AthleteStats-tyyppi määritelty kahdesti

```typescript
// types/index.ts:
export interface AthleteStats { ... }

// AthleteCard.tsx:5-14 - DUPLIKAATTI:
interface AthleteStats { ... }
```

---

## 3. Uudelleenkäytettävyys

**Hyvin uudelleenkäytettävät:**
- `Dialog` - geneerinen modalin pohja
- `ConfirmDialog` - vahvistusdialogin standardimalli
- `PhotoGallery` - entity-pohjainen, erittäin joustava
- `PhotoViewer` - erillinen katselukomponentti
- `EmptyState` - yhtenäinen tyhjä tila
- `DatePicker`, `TimeInput`, `DistanceInput` - erikoistuneet syötteet

**Osittain uudelleenkäytettävät:**
- `StatCard` - käytetään vain yhdessä paikassa
- `CompetitionCard` - voisi olla geneerisempi
- `ResultCard` - melko spesifinen

**Ei uudelleenkäytettävät:**
- `ResultForm` ja `ResultEditDialog` - paljon duplikaatiota
- `CompetitionForm` - sama autocomplete-logiikka

---

## 4. Props-rakenne

**Hyvät esimerkit:**

```typescript
// Dialog - selkeä ja yksinkertainen
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

// PhotoGallery - joustavat optiot
interface PhotoGalleryProps {
  entityType: EntityType;
  entityId: number;
  canAdd?: boolean;
  canDelete?: boolean;
  maxPhotos?: number;
  displayLimit?: number;
  onPhotoCountChange?: (count: number) => void;
}
```

**Parannettavat:**

```typescript
// ResultForm - voisi olla yksinkertaisempi
interface ResultFormProps {
  athleteId?: number;
  onSave: (result: NewResult, medal?: { type: MedalType; competitionName: string }) => void;
  onCancel: () => void;
}
// Ongelma: medal-parametri onSave:ssa on epätyypillinen pattern

// CompetitionForm - liikaa initiaalitilaa
interface CompetitionFormProps {
  competition?: Competition;
  initialDate?: string;
  initialParticipants?: { athleteId: number; disciplinesPlanned?: number[] }[];
  onSave: (...) => void;
  onCancel: () => void;
}
// Voisi käyttää yhtä `initialData`-propsia
```

---

## 5. Suositellut parannukset

### Prioriteetti 1: Luo jaettuja hookkeja ja komponentteja ✅ VALMIS (23.12.2024)

Toteutettu:
- `hooks/useAutocomplete.ts` - Geneerinen autocomplete-logiikka
- `hooks/useDisciplineFields.ts` - Lajikategorian tarkistukset (showWindField, isHurdleDiscipline, etc.)
- `components/shared/AutocompleteInput.tsx` - Geneerinen autocomplete-syöte
- `lib/constants.ts` - Lisätty `COMPETITION_LEVEL_OPTIONS`

### Prioriteetti 2: Refaktoroi ResultForm ja ResultEditDialog ✅ OSITTAIN (23.12.2024)

Molemmat komponentit nyt käyttävät jaettuja hookkeja:
- `useDisciplineFields` - lajikategorian tarkistukset
- `AutocompleteInput` - kilpailun nimen autocomplete

Jäljellä (ei kriittistä):
- Komponentit vielä erilliset (~80% jaettua logiikkaa)
- Mahdollinen jatko: `useResultForm.ts` + `ResultFormFields.tsx`

### Prioriteetti 3: Paranna ConfirmDialog ✅ VALMIS (23.12.2024)

Paranneltu olemassa olevaa `ConfirmDialog`:
- Lisätty `variant="danger"` tuki poisto-operaatioille (punainen nappi)
- Lisätty `loading` prop async-operaatioille
- Lisätty automaattinen async-tuki `onConfirm` handlereille
- Korvattu duplikaatti delete-dialogit: Dashboard.tsx, ResultEditDialog.tsx, Goals.tsx

### Prioriteetti 4: Korjaa duplikaattityypit ✅ VALMIS (23.12.2024)

- `AthleteCard.tsx` - Käyttää nyt jaettua `AthleteStats` tyyppiä `types/index.ts`:stä

---

## Yhteenveto

| Kategoria | Tila | Kommentti |
|-----------|------|-----------|
| Komponenttien koko | Keskiverto | 2 kriittisen suurta, 5 suurehkoa |
| Koodin duplikaatio | **Parantunut** | Autocomplete, level-optiot, delete-dialogit refaktoroitu |
| Uudelleenkäytettävyys | **Parantunut** | Uudet hookit ja komponentit |
| Props-rakenne | Hyvä | Selkeitä, muutama poikkeus |

**Kokonaisarvio:** Arkkitehtuuri on parantunut merkittävästi. Uudet hookit (`useAutocomplete`, `useDisciplineFields`) ja `AutocompleteInput`-komponentti ovat käytössä kaikissa kolmessa paikassa (CompetitionForm, ResultForm, ResultEditDialog). Delete-dialogit on yhtenäistetty `ConfirmDialog`:n avulla.

---

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

## Tehty (23.12.2024)

### 1. results.rs refaktorointi ✅

`src-tauri/src/commands/results.rs` (1496 riviä) jaettu moduulirakenteeksi:

```
src-tauri/src/commands/results/
├── mod.rs      - Re-exportit (12 riviä)
├── crud.rs     - CRUD-operaatiot (435 riviä)
├── records.rs  - SE/KE-laskenta (510 riviä)
├── medals.rs   - Mitalit (77 riviä)
├── types.rs    - Vakiot (21 riviä)
└── tests.rs    - Testit (642 riviä)
```

### 2. Testit ✅

Testit lisätty:
- **Unit-testit:** Vitest (61 testiä) - `npm run test:run`
- **E2E-testit:** Playwright (59 testiä) - `npx playwright test`
- **Rust-testit:** 23 testiä - `cargo test`

### 3. Dokumentaatiotiedostot ✅

Siirretty `docs/`-kansioon:
- UI_SPEC.md
- THEME_SPEC.md
- CODE_ANALYSIS.md
- DATABASE_ANALYSIS.md
- REVIEW_REPORT.md
- REFACTORING_NOTES.md (tämä tiedosto)
- USER_GUIDE.md

CLAUDE.md ja README.md jäävät juureen.

### 4. Turha tiedosto ✅

Poistettu: `nul`

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
