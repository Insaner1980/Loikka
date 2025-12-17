# Loikka - Claude Code Ohjeistus

Tämä tiedosto sisältää ohjeistuksen Claude Code -avustajalle Loikka-projektin kehityksessä.

## Projektin yleiskuvaus

**Loikka** on Tauri v2 -pohjainen työpöytäsovellus nuorten yleisurheilutulosten seurantaan. Sovellus on suunnattu valmentajille ja vanhemmille, jotka haluavat seurata nuorten urheilijoiden kehitystä.

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
- `tauri-plugin-mcp-bridge` - MCP-integraatio (vain dev-buildissa)

## Kielivalinnat

- **Käyttöliittymä:** Suomi (Finnish)
- **Koodi:** Englanti (muuttujat, funktiot, kommentit)
- **Git-viestit:** Englanti

### Suomenkieliset termit

| Englanti | Suomi |
|----------|-------|
| Dashboard | Etusivu |
| Athletes | Urheilijat |
| Results | Tulokset |
| Calendar | Kalenteri |
| Statistics | Tilastot |
| Goals | Tavoitteet |
| Photos | Kuvat |
| Settings | Asetukset |
| Personal Best (PB) | SE (Ennätys) |
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
│   │   └── formatters.ts   # Muotoilufunktiot (aika, matka, päivämäärä, asset URL)
│   ├── pages/              # Sivukomponentit
│   ├── stores/             # Zustand-storet
│   ├── types/              # TypeScript-tyypit
│   ├── App.tsx             # Reititys
│   ├── index.css           # Tailwind v4 + teemat
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/       # Tauri-komennot (athletes, results, photos, ym.)
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
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Väripaletti (Premium Dark Theme)

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

/* Aksentti - neutraali */
--accent: #7C7C7C;
--accent-hover: #999999;

/* Tilat */
--color-success: #4ADE80;     /* Vihreä - onnistuminen, SE */
--color-warning: #FACC15;     /* Keltainen - varoitus, KE */
--color-error: #EF4444;       /* Punainen - virhe */

/* Mitalit */
--color-gold: #FFD700;
--color-silver: #C0C0C0;
--color-bronze: #CD7F32;
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
| `usePhotoStore` | Kuvat ja galleria |
| `useSyncStore` | Google Drive -synkronointi |

### Custom Hooks

| Hook | Kuvaus |
|------|--------|
| `useReminders` | Kilpailumuistutukset ja notifikaatiot |
| `useKeyboardShortcuts` | Pikanäppäimet (Ctrl+N lisää uusi) |
| `usePhotos` | Kuvien hallinta entity-pohjaisesti |
| `useTheme` | Teeman hallinta |

### Tyylit (Tailwind v4)

- Käytä Tailwind-luokkia inline
- Teemavärit CSS-muuttujina (esim. `bg-[#141414]`, `text-[#888888]`)
- Komponenttiluokat `index.css`:ssä (`btn-primary`, `btn-secondary`, `card-hover`, ym.)
- Animaatiot: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`

### Tiedostopolut

- Käytä suhteellisia polkuja (`../components/...`)
- Index-tiedostot exporteille (`components/athletes/index.ts`)
- Asset URL:t `convertFileSrc`-funktiolla (`@tauri-apps/api/core`)

## Tärkeät tiedostot

| Tiedosto | Kuvaus |
|----------|--------|
| `src/types/index.ts` | Kaikki TypeScript-tyypit |
| `src/data/disciplines.ts` | Lajitiedot ja kategorialabelit |
| `src/lib/formatters.ts` | Aika, matka, päivämäärä, asset URL -muotoilu |
| `src/index.css` | Tailwind v4 -konfiguraatio ja teemat |
| `src-tauri/src/db/schema.sql` | Tietokantaskeema |
| `src-tauri/src/db/seed_disciplines.sql` | Lajien seed-data |
| `src-tauri/src/commands/*.rs` | Tauri-komennot |
| `src-tauri/capabilities/default.json` | Tauri-oikeudet ja -rajoitukset |

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
- [x] Tumma teema (Linear-tyylinen)

## Keskeneräiset ominaisuudet

1. **Google Drive -synkronointi:** Tietokanta paikallisesti, pilvivarmuuskopiointi TODO
2. **Kehityskaaviot:** Tilastot-sivu osittain toteutettu
3. **Testaus:** Ei testejä vielä (Vitest + Playwright suositus)

## Tietokantamigraatiot

Migraatiot ajetaan automaattisesti sovelluksen käynnistyksessä (`database.rs`):

| Versio | Kuvaus |
|--------|--------|
| v1 | Alkuperäinen skeema (schema.sql) |
| v2 | Lajien seed-data (seed_disciplines.sql) |
| v3 | Photos-taulun uudelleenluonti (entity-pohjainen) |

## Muuta

- Asset-protokolla käytössä (`protocol-asset` feature Rust-puolella)
- Kuvat tallennetaan `%APPDATA%/com.loikka.app/photos/` ja `profile_photos/`
- Thumbnailit generoidaan automaattisesti (300px)
- Lazy loading käytössä sivuille (`React.lazy` + `Suspense`)
