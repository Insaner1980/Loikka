# Loikka - Claude Code Ohjeistus

Tämä tiedosto sisältää ohjeistuksen Claude Code -avustajalle Loikka-projektin kehityksessä.

## Projektin yleiskuvaus

**Loikka** on Tauri v2 -pohjainen työpöytäsovellus nuorten yleisurheilutulosten seurantaan. Sovellus on suunnattu kehittäjän sisarta varten, joka haluaa seurata tytärtensä kehitystä.

### Teknologiapino

- **Frontend:** React 19 + TypeScript + Vite 7
- **Backend:** Tauri v2 (Rust)
- **Tietokanta:** SQLite (sqlx)
- **Tyylitys:** Tailwind CSS v4
- **Tilanhallinta:** Zustand 5
- **Reititys:** React Router v7
- **Ikonit:** Lucide React
- **Kaaviot:** Recharts 3
- **Päivämäärät:** date-fns 4

### Tauri-pluginit

- `tauri-plugin-dialog` - Tiedostovalitsin
- `tauri-plugin-fs` - Tiedostojärjestelmä
- `tauri-plugin-notification` - Ilmoitukset (kilpailumuistutukset)
- `tauri-plugin-opener` - Linkkien avaus
- `tauri-plugin-sql` - SQLite-tietokanta
- `tauri-plugin-mcp-bridge` - MCP-integraatio (vain dev-buildissa)

## Kielivalinnat

- **Käyttöliittymä:** Suomi (Finnish)
- **Koodi:** Englanti (muuttujat, funktiot, kommentit)
- **Git-viestit:** Englanti

### Suomenkieliset termit

| Englanti | Suomi |
|----------|-------|
| Dashboard | Lähtöviiva |
| Athletes | Urheilijat |
| Results | Tulokset |
| Calendar | Kalenteri |
| Statistics | Tilastot |
| Goals | Tavoitteet |
| Photos | Kuvat |
| Settings | Asetukset |
| Personal Best (PB) | OE (Oma ennätys) |
| Season Best (SB) | KE (Kauden ennätys) |
| Save | Tallenna |
| Cancel | Peruuta |
| Add | Lisää |
| Edit | Muokkaa |
| Delete | Poista |
| Back | Takaisin |
| First name | Etunimi |
| Last name | Sukunimi |
| Birth year | Syntymävuosi |
| Club | Seura |
| Discipline | Laji |
| Competition | Kilpailu |
| Training | Harjoitus |
| Medal | Mitali |
| Gold | Kulta |
| Silver | Hopea |
| Bronze | Pronssi |

## Projektirakenne

```
C:\dev\Loikka\
├── src/
│   ├── components/
│   │   ├── athletes/       # Urheilija-komponentit
│   │   │   └── tabs/       # Urheilijan yksityiskohtasivun tab-komponentit
│   │   ├── competitions/   # Kilpailukomponentit
│   │   ├── goals/          # Tavoitekomponentit
│   │   ├── layout/         # Layout-komponentit (Sidebar, Layout, TitleBar)
│   │   ├── photos/         # Kuvagalleriakomponentit
│   │   ├── results/        # Tulos-komponentit
│   │   ├── settings/       # Asetuskomponentit
│   │   ├── shared/         # Jaetut komponentit (StatCard, PhotoGallery)
│   │   ├── statistics/     # Tilastokomponentit (kaaviot)
│   │   └── ui/             # UI-primitiivit (Dialog, Toast, Spinner)
│   ├── data/
│   │   └── disciplines.ts  # Lajitiedot
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── constants.ts    # Sovelluksen vakiot
│   │   ├── database.ts     # Tietokantaoperaatiot
│   │   ├── exportImport.ts # Vienti/tuonti
│   │   ├── formatters.ts   # Muotoilufunktiot
│   │   ├── googleDrive.ts  # Google Drive -integraatio
│   │   └── index.ts        # Exportit
│   ├── pages/              # Sivukomponentit
│   │   ├── AthleteDetail.tsx # Urheilijan yksityiskohtasivu
│   │   ├── Athletes.tsx
│   │   ├── Calendar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Goals.tsx
│   │   ├── Photos.tsx
│   │   ├── Results.tsx
│   │   ├── Settings.tsx
│   │   └── Statistics.tsx
│   ├── stores/             # Zustand-storet
│   ├── types/              # TypeScript-tyypit
│   ├── App.tsx             # Reititys
│   ├── index.css           # Tailwind v4 + teemat
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/       # Tauri-komennot
│   │   │   ├── athletes.rs
│   │   │   ├── competitions.rs
│   │   │   ├── goals.rs
│   │   │   ├── google_drive.rs
│   │   │   ├── photos.rs
│   │   │   ├── results.rs
│   │   │   └── sync.rs
│   │   ├── db/             # Tietokantaskeema ja seed
│   │   │   ├── schema.sql
│   │   │   └── seed_disciplines.sql
│   │   ├── types.rs        # Rust-tyypit
│   │   ├── database.rs     # Tietokantayhteys
│   │   └── lib.rs          # Tauri-sovellus
│   ├── capabilities/
│   │   └── default.json    # Tauri-oikeudet
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                   # Dokumentaatio
│   ├── UI_SPEC.md          # Käyttöliittymän spesifikaatio
│   ├── DATABASE_ANALYSIS.md # Tietokanta-analyysi
│   ├── CODE_ANALYSIS.md    # Koodi-analyysi
│   ├── REVIEW_REPORT.md    # Arviointiraportti
│   ├── REFACTORING_NOTES.md # Refaktorointimuistiinpanot
│   └── USER_GUIDE.md       # Käyttöohje
├── CLAUDE.md               # Tämä tiedosto
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Vakiot (constants.ts)

Kaikki tärkeät numeeriset arvot on keskitetty `src/lib/constants.ts` -tiedostoon:

```typescript
// Dashboard-rajoitukset
export const DASHBOARD = {
  MAX_COMPETITIONS: 5,
  MAX_RESULTS: 5,
  MAX_ATHLETES: 2,
} as const;

// Kilpailun kiireellisyys (värikoodaus)
export const COMPETITION_URGENCY = {
  IMMINENT: 3,   // Vihreä - 0-3 päivää
  SOON: 7,       // Keltainen - 4-7 päivää
  UPCOMING: 14,  // Oranssi - 8-14 päivää
} as const;

// Sivutus
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  RESULTS_PER_PAGE: 10,
} as const;

// Vuosivalitsin
export const YEAR_RANGE = {
  START_YEAR: 2021,
  YEARS_AHEAD: 1,
} as const;

// Urheilijan syntymävuosi
export const ATHLETE_BIRTH_YEAR = {
  MIN: 2005,
  MAX: 2022,
} as const;

// Toast-ilmoitukset
export const TOAST = {
  DURATION_MS: 4000,
  EXIT_ANIMATION_MS: 200,
} as const;
```

## Väripaletti

Sovellus käyttää tummaa teemaa. Kaikki värit määritellään CSS-muuttujina `index.css`:ssä.

```css
/* Taustat */
--bg-base: #0A0A0A;           /* Pääasiallinen tausta */
--bg-surface: #111111;        /* Kortit ja pinnat */
--bg-elevated: #191919;       /* Korotetut elementit */
--bg-hover: #1a1a1a;          /* Hover-tila */

/* Reunat - lähes näkymättömät */
--border-subtle: rgba(255, 255, 255, 0.04);
--border-default: rgba(255, 255, 255, 0.06);
--border-hover: rgba(255, 255, 255, 0.1);

/* Teksti */
--text-primary: #E8E8E8;      /* Pääasiallinen teksti */
--text-secondary: #888888;    /* Toissijainen teksti */
--text-muted: #555555;        /* Himmennetty teksti */
--text-placeholder: #666666;  /* Placeholder-teksti */
--text-initials: #444444;     /* Nimikirjaimet avatarissa */

/* Aksentti - sininen */
--accent: #60A5FA;            /* Pääkorostusväri */
--accent-hover: #93C5FD;      /* Hover-tila */
--accent-muted: rgba(96, 165, 250, 0.15);
--btn-primary-text: #0A0A0A;  /* Primary-napin teksti */

/* Tilat */
--status-success: #10B981;    /* Vihreä - onnistuminen */
--status-warning: #FACC15;    /* Keltainen - varoitus */
--status-orange: #F59E0B;     /* Oranssi - 8-14pv kilpailuun */
--status-error: #EF4444;      /* Punainen - virhe */

/* Mitalit */
--color-gold: #FFD700;
--color-silver: #C0C0C0;
--color-bronze: #CD7F32;

/* Overlay */
--overlay-bg: rgba(0, 0, 0, 0.8);
--overlay-gradient: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
```

## Tietokantarakenne

Tietokanta sijaitsee: `%APPDATA%/com.loikka.app/loikka.db`

### Taulut

| Taulu | Kuvaus |
|-------|--------|
| `athletes` | Urheilijat (nimi, syntymävuosi, seura, profiilikuva) |
| `disciplines` | Lajit (esitäytetty, nimi, kategoria, yksikkö) |
| `results` | Tulokset (arvo, päivämäärä, SE/KE-status) |
| `competitions` | Kilpailut (nimi, paikka, muistutukset) |
| `competition_participants` | Kilpailuosallistujat |
| `goals` | Tavoitteet (tavoitearvo, status) |
| `medals` | Mitalit (kulta/hopea/pronssi) |
| `photos` | Kuvat (entity-pohjainen: athletes/results/competitions) |
| `sync_status` | Google Drive -synkronointitila |

### Lajikategoriat

- `sprints` - Pikajuoksut (60m, 100m, 200m, 400m)
- `middleDistance` - Keskimatkat (800m, 1000m, 1500m)
- `longDistance` - Pitkät matkat (3000m, 5000m, 10000m)
- `hurdles` - Aitajuoksut (60m aj, 80m aj, 100m aj, 110m aj, 300m aj, 400m aj)
- `jumps` - Hypyt (pituus, kolmiloikka, korkeus, seiväs)
- `throws` - Heitot (kuula, kiekko, keihäs, moukari, pallo)
- `combined` - Yhdistetyt (5-ottelu, 7-ottelu, 10-ottelu)

## Ikkunan asetukset

```json
{
  "width": 1200,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "decorations": false,   /* Oma otsikkopalkki (TitleBar.tsx) */
  "resizable": true,
  "center": true
}
```

## Kehityskomennot

```bash
# Käynnistä kehityspalvelin
npm run tauri dev

# Rakenna tuotantoversio
npm run tauri build

# Tyyppitarkistus
npm run build   # sisältää tsc

# Porttikonflikti (jos 1420 varattu)
taskkill //F //IM node.exe
taskkill //F //IM loikka-temp.exe
```

## Koodauskonventiot

### Komponentit

- Funktionaaliset komponentit (`function Component()`)
- Props-tyypit interface-muodossa
- Tiedostonimi = komponentin nimi (PascalCase)
- Yksi komponentti per tiedosto

```tsx
interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

export function MyComponent({ value, onChange }: MyComponentProps) {
  return <div>{value}</div>;
}
```

### Tilanhallinta (Zustand)

```tsx
interface MyStore {
  items: Item[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: NewItem) => Promise<Item>;
}

export const useMyStore = create<MyStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  // ...
}));
```

### Zustand-storet

| Store | Kuvaus |
|-------|--------|
| `useAthleteStore` | Urheilijat ja tilastot |
| `useResultStore` | Tulokset ja lajit |
| `useCompetitionStore` | Kilpailut |
| `useGoalStore` | Tavoitteet |
| `usePhotoStore` | Kuvat ja galleria (myös entity-kohtaiset kuvat) |
| `useSyncStore` | Google Drive -synkronointi |

### Custom Hooks

| Hook | Kuvaus |
|------|--------|
| `useReminders` | Kilpailumuistutukset ja notifikaatiot |
| `useNavigationShortcuts` | Navigointipikanäppäimet (1-8), kutsutaan Layout:ssa |
| `useAddShortcut` | Lisää uusi -pikanäppäin (Ctrl+U), sivukohtainen |
| `useEscapeKey` | Esc-näppäin (peruuta/sulje), ehdollinen aktivointi |
| `useCalendarKeyboard` | Kalenterin näppäinohjaus (←/→ kuukaudet, T tänään) |
| `useTheme` | Teeman hallinta (vain dark) |
| `useAthleteData` | Urheilijan tulokset, ennätykset, mitalit, tavoitteet |

### Muotoilufunktiot (formatters.ts)

| Funktio | Kuvaus |
|---------|--------|
| `formatTime(seconds)` | Sekunnit → "12.34" / "1:23.45" / "1:02:34.56" |
| `formatDistance(meters)` | Metrit → "4.56 m" |
| `formatDate(dateString)` | ISO-päivämäärä → "21.12.2025" (fi-FI) |
| `toISODate(date)` | Date → "2025-12-21" |
| `getTodayISO()` | Tämän päivän ISO-muoto |
| `toAssetUrl(filePath)` | Tiedostopolku → Tauri asset URL |
| `getAgeCategory(birthYear)` | Syntymävuosi → "T7"/"T9"/.../N" |
| `formatWind(wind, birthYear?, year?)` | Tuuli → "+1.8" / "+2.3w" |
| `formatResultWithWind(value, unit, wind?, ...)` | Tulos tuulen kanssa |
| `getStatusLabel(status)` | Status → "Hyväksytty" / "NM - Ei tulosta" |
| `getInitials(firstName, lastName)` | Nimet → "EK" |
| `getDaysUntil(dateStr)` | Päivämäärä → päivien lukumäärä tähän päivään |

### Tyylit (Tailwind v4)

**TÄRKEÄÄ:** Älä käytä kovakoodattuja väri- tai fonttikoko-arvoja komponenteissa!

❌ Väärin:
```tsx
<div className="bg-[#141414] text-[#888888] text-[13px]">
```

✅ Oikein:
```tsx
<div className="bg-card text-muted-foreground text-body">
```

**Poikkeukset** (kovakoodaus sallittu):
1. Kuvien päällä olevat overlayt: `bg-black/50 text-white`
2. CSS-muuttujat opacityllä: `bg-[var(--accent)]/10`

**Typografia-luokat:**
```tsx
text-caption    // 11px - badget, kuvatekstit
text-body       // 13px - body-teksti, labelit, napit
text-default    // 14px - standardi teksti
text-title      // 16px - sivuotsikot, korttiotsikot
text-heading    // 20px - hero-otsikot
text-stat       // 24px - tilastonumerot
text-hero-stat  // 28px - hero-tilastonumerot
```

**Korttien hover-malli:**
```tsx
// Kaikki kortit käyttävät samaa mallia
className="bg-card border border-border-subtle hover:border-border-hover transition-colors duration-150"
```

**Lista/taulukkorivit:**
```tsx
// Rivit käyttävät taustavärin vaihtoa
className="hover:bg-card-hover transition-colors duration-150"
```

### Tiedostopolut

- Käytä suhteellisia polkuja (`../components/...`)
- Index-tiedostot exporteille (`components/athletes/index.ts`)
- Asset URL:t `convertFileSrc`-funktiolla (`@tauri-apps/api/core`)

## Tärkeät tiedostot

| Tiedosto | Kuvaus |
|----------|--------|
| `src/types/index.ts` | Kaikki TypeScript-tyypit |
| `src/data/disciplines.ts` | Lajitiedot ja kategorialabelit |
| `src/lib/constants.ts` | Sovelluksen vakiot |
| `src/lib/formatters.ts` | Aika, matka, päivämäärä, asset URL, nimikirjaimet, päivälaskuri |
| `src/lib/googleDrive.ts` | Google Drive -autentikointi ja API |
| `src/index.css` | Tailwind v4 -konfiguraatio ja teemat |
| `src-tauri/src/db/schema.sql` | Tietokantaskeema |
| `src-tauri/src/db/seed_disciplines.sql` | Lajien seed-data |
| `src-tauri/src/commands/*.rs` | Tauri-komennot |
| `src-tauri/capabilities/default.json` | Tauri-oikeudet ja -rajoitukset |
| `docs/UI_SPEC.md` | Käyttöliittymän spesifikaatio |

## Toteutetut ominaisuudet

- [x] Urheilijoiden hallinta (CRUD)
- [x] Tulosten kirjaus ja SE/KE-seuranta
- [x] Kilpailukalenteri
- [x] Kilpailumuistutukset (tauri-plugin-notification)
- [x] Tavoitteiden asettaminen
- [x] Mitaleiden seuranta
- [x] Kuvagalleria (entity-pohjainen)
- [x] Profiilikuvat urheilijoille
- [x] Tilastokaaviot (Recharts)
- [x] Oma otsikkopalkki (decorations: false)
- [x] Tumma teema
- [x] Tietojen vienti/tuonti (JSON)

## Keskeneräiset ominaisuudet

1. **Google Drive -synkronointi:** UI valmis, backend (OAuth2, tiedostosynkronointi) keskeneräinen
2. **Kehityskaaviot:** Tilastot-sivu osittain toteutettu

## Testaus

- **Unit-testit:** Vitest (61 testiä)
- **E2E-testit:** Playwright (59 testiä)
- **Rust-testit:** cargo test (23 testiä)

## Tietokantamigraatiot

Migraatiot ajetaan automaattisesti sovelluksen käynnistyksessä (`database.rs`):

| Versio | Kuvaus |
|--------|--------|
| v1 | Alkuperäinen skeema (schema.sql) |
| v2 | Lajien seed-data (seed_disciplines.sql) |
| v3 | Photos-taulun uudelleenluonti (entity-pohjainen) |
| v4 | Lisää `level`-sarake competitions-tauluun |
| v5 | Lisää `competition_level`-sarake results-tauluun |

## Muuta

- Asset-protokolla käytössä (`protocol-asset` feature Rust-puolella)
- Kuvat tallennetaan `%APPDATA%/com.loikka.app/photos/` ja `profile_photos/`
- Thumbnailit generoidaan automaattisesti (300px)
- Lazy loading käytössä sivuille (`React.lazy` + `Suspense`)
- Katso `docs/UI_SPEC.md` yksityiskohtaiselle käyttöliittymädokumentaatiolle
