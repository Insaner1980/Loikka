# Loikka - Claude Code Ohjeistus

Tämä tiedosto sisältää ohjeistuksen Claude Code -avustajalle Loikka-projektin kehityksessä.

## Projektin yleiskuvaus

**Loikka** on Tauri v2 -pohjainen työpöytäsovellus nuorten yleisurheilutulosten seurantaan. Sovellus on suunnattu valmentajille ja vanhemmille, jotka haluavat seurata nuorten urheilijoiden kehitystä.

### Teknologiapino

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Tauri v2 (Rust)
- **Tietokanta:** SQLite (tauri-plugin-sql)
- **Tyylitys:** Tailwind CSS v4
- **Tilanhallinta:** Zustand
- **Reititys:** React Router v6
- **Ikonit:** Lucide React

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
│   │   ├── layout/         # Layout-komponentit (Sidebar, Layout)
│   │   ├── results/        # Tulos-komponentit
│   │   ├── shared/         # Jaetut komponentit (StatCard)
│   │   └── ui/             # UI-primitiivit (Dialog, Tooltip)
│   ├── data/
│   │   └── disciplines.ts  # Lajitiedot
│   ├── lib/
│   │   ├── database.ts     # Tietokanta-apufunktiot
│   │   └── formatters.ts   # Muotoilufunktiot
│   ├── pages/              # Sivukomponentit
│   ├── stores/             # Zustand-storet
│   ├── types/              # TypeScript-tyypit
│   ├── App.tsx
│   ├── index.css           # Tailwind + teemat
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── db/             # Tietokantamigraatiot (Rust)
│   │   └── lib.rs          # Tauri-sovellus
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Väripaletti

```css
--color-primary: #FDF200;        /* Keltainen - pääväri */
--color-secondary: #2700FF;      /* Sininen - toissijainen */
--color-gold: #FFD700;           /* Kultamitali */
--color-silver: #C0C0C0;         /* Hopeamitali */
--color-bronze: #CD7F32;         /* Pronssimitali */
```

## Tietokantarakenne

Tietokanta sijaitsee: `%APPDATA%/com.loikka.app/loikka.db`

### Taulut

- `athletes` - Urheilijat
- `disciplines` - Lajit (esitäytetty)
- `results` - Tulokset
- `competitions` - Kilpailut
- `competition_participants` - Kilpailuosallistujat
- `goals` - Tavoitteet
- `medals` - Mitalit
- `photos` - Kuvat
- `sync_status` - Synkronointitila

## Kehityskomennot

```bash
# Käynnistä kehityspalvelin
npm run tauri dev

# Rakenna tuotantoversio
npm run tauri build

# Tyyppitarkistus
npm run typecheck

# Lint
npm run lint
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

### Tyylit (Tailwind)

- Käytä Tailwind-luokkia inline
- Toistuvat tyylit -> komponentteihin
- Teemavärit CSS-muuttujina (`bg-primary`, `text-muted-foreground`)

### Tiedostopolut

- Käytä suhteellisia polkuja (`../components/...`)
- Index-tiedostot exporteille (`components/athletes/index.ts`)

## Tärkeät tiedostot

| Tiedosto | Kuvaus |
|----------|--------|
| `src/types/index.ts` | Kaikki TypeScript-tyypit |
| `src/data/disciplines.ts` | Lajitiedot ja kategorialabelit |
| `src/lib/formatters.ts` | Aika- ja matkamuotoilu |
| `src/lib/database.ts` | Tietokanta-apufunktiot |
| `src/index.css` | Tailwind-konfiguraatio ja teemat |
| `src-tauri/src/db/mod.rs` | Tietokantaskeema |
| `src-tauri/src/db/seed.rs` | Lajien seed-data |

## Huomioitavaa

1. **Mock-data:** Tällä hetkellä storet käyttävät mock-dataa. TODO: Yhdistä SQLite-tietokantaan.

2. **Kuvavalitsin:** AthleteForm:ssa kuvavalitsin on placeholder. TODO: Integroi `@tauri-apps/plugin-dialog`.

3. **Synkronointi:** Google Drive -synkronointi ei ole vielä toteutettu.

4. **Kehityskaaviot:** Kehitys-välilehti on placeholder. TODO: Integroi kaaviokirjasto (esim. Recharts).

5. **Porttikonflikti:** Jos portti 1420 on varattu, sulje aiemmat prosessit:
   ```bash
   taskkill //F //IM node.exe
   taskkill //F //IM loikka-temp.exe
   ```

## Testaus

Testejä ei ole vielä konfiguroitu. Suositus:
- Vitest yksikkötesteille
- Playwright E2E-testeille

## Muuta

- Sovelluksen ikkunan minimikoko: 900x600
- Tietokannan varmuuskopiointi: TODO
- Lokalisointi: Vain suomi tällä hetkellä
