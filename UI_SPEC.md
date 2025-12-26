# Loikka - UI Specification

Tämä dokumentti määrittelee Loikka-sovelluksen käyttöliittymän suunnitteluperiaatteet ja komponentit.

## Design Philosophy

**Premium minimalistinen teema** - Vain tumma teema.

Periaatteet:
- Hillityt värit, vahva kontrasti tekstissä
- Hienovaraiset reunat (border-based hover)
- Yhtenäiset animaatiot (`transition-colors duration-150`)
- Selkeä hierarkia
- Toiminnallisuus ennen koristeita
- Ei kovakoodattuja väriarvoja komponenteissa - kaikki värit teemamuuttujista

---

## Vakiot (constants.ts)

Kaikki tärkeät numeeriset arvot on keskitetty `src/lib/constants.ts` -tiedostoon.

### Dashboard-rajoitukset

```typescript
export const DASHBOARD = {
  MAX_COMPETITIONS: 5,  // Näytettävät kilpailut etusivulla
  MAX_RESULTS: 5,       // Näytettävät tulokset etusivulla
  MAX_ATHLETES: 2,      // Näytettävät urheilijat etusivulla
} as const;
```

### Kilpailun kiireellisyys (värikoodaus)

```typescript
export const COMPETITION_URGENCY = {
  IMMINENT: 3,   // Vihreä - 0-3 päivää
  SOON: 7,       // Keltainen - 4-7 päivää
  UPCOMING: 14,  // Oranssi - 8-14 päivää
} as const;
```

### Sivutus

```typescript
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  RESULTS_PER_PAGE: 10,
} as const;
```

### Vuosivalitsin

```typescript
export const YEAR_RANGE = {
  START_YEAR: 2021,  // Ensimmäinen vuosi valitsimissa
  YEARS_AHEAD: 1,    // Kuinka monta vuotta eteenpäin
} as const;
```

### Urheilijan syntymävuosi

```typescript
export const ATHLETE_BIRTH_YEAR = {
  MIN: 2005,  // Vanhin sallittu syntymävuosi
  MAX: 2022,  // Nuorin sallittu syntymävuosi
} as const;
```

### Toast-ilmoitukset

```typescript
export const TOAST = {
  DURATION_MS: 4000,      // Näyttöaika
  EXIT_ANIMATION_MS: 200, // Poistumisanimaation kesto
} as const;
```

---

## Väripaletti

### Dark Theme (oletus)

#### Taustat

| Muuttuja | Arvo | Tailwind | Käyttö |
|----------|------|----------|--------|
| `--bg-base` | `#0A0A0A` | `bg-background` | Sovelluksen päätausta |
| `--bg-surface` | `#111111` | `bg-card` | Kortit ja pinnat |
| `--bg-elevated` | `#191919` | `bg-muted` / `bg-elevated` | Korotetut elementit |
| `--bg-hover` | `#1a1a1a` | `bg-card-hover` | Hover-tila |

#### Reunat

| Muuttuja | Arvo | Tailwind | Käyttö |
|----------|------|----------|--------|
| `--border-subtle` | `rgba(255,255,255,0.04)` | `border-border-subtle` | Hienovarainen erottelu |
| `--border-default` | `rgba(255,255,255,0.06)` | `border-border` | Oletusreuna |
| `--border-hover` | `rgba(255,255,255,0.1)` | `border-border-hover` | Hover-tila |

#### Teksti

| Muuttuja | Arvo | Tailwind | Käyttö |
|----------|------|----------|--------|
| `--text-primary` | `#E8E8E8` | `text-foreground` | Pääasiallinen teksti |
| `--text-secondary` | `#888888` | `text-muted-foreground` | Toissijainen teksti |
| `--text-muted` | `#555555` | `text-text-tertiary` | Himmennetty teksti |
| `--text-placeholder` | `#666666` | `text-[var(--text-placeholder)]` | Placeholder-teksti |
| `--text-initials` | `#444444` | `text-[var(--text-initials)]` | Nimikirjaimet avatarissa |

#### Korostusväri (Accent)

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--accent` | `#60A5FA` | Pääkorostusväri (sininen) |
| `--accent-hover` | `#93C5FD` | Hover-tila |
| `--accent-muted` | `rgba(96, 165, 250, 0.15)` | Tausta/glow |
| `--accent-glow` | `rgba(96, 165, 250, 0.3)` | Voimakkaampi glow |
| `--btn-primary-text` | `#0A0A0A` | Primary-napin teksti |

#### Tilavärit

| Muuttuja | Arvo | Tailwind | Käyttö |
|----------|------|----------|--------|
| `--status-success` | `#10B981` | `text-success` | Onnistuminen |
| `--status-success-bright` | `#4ADE80` | - | Kirkkaampi vihreä |
| `--status-warning` | `#FACC15` | `text-warning` | Varoitus (keltainen) |
| `--status-orange` | `#F59E0B` | `text-[var(--status-orange)]` | Oranssi (14pv kilpailuun) |
| `--status-error` | `#EF4444` | `text-error` | Virhe |

#### Mitalit

| Muuttuja | Arvo | Tailwind |
|----------|------|----------|
| `--color-gold` | `#FFD700` | `bg-gold` |
| `--color-silver` | `#C0C0C0` | `bg-silver` |
| `--color-bronze` | `#CD7F32` | `bg-bronze` |

#### Overlay

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--overlay-bg` | `rgba(0, 0, 0, 0.8)` | Dialog backdrop |
| `--overlay-light` | `rgba(0, 0, 0, 0.5)` | Kevyempi overlay |
| `--overlay-gradient` | `linear-gradient(to top, rgba(0,0,0,0.8), transparent)` | Kuvan päällä oleva gradient |

---

## Typografia

**Fontti:** Inter (system fallback: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)

### Typografiaskaala (CSS-muuttujat)

Kaikki fontikoot on määritelty `@theme`-lohkossa `index.css`:ssä:

```css
@theme {
  --font-size-xs: 11px;      /* Badges, captions */
  --font-size-sm: 13px;      /* Body text, labels, buttons */
  --font-size-base: 14px;    /* Standard text */
  --font-size-lg: 16px;      /* Page titles, card titles */
  --font-size-xl: 20px;      /* Hero headings */
  --font-size-2xl: 24px;     /* Large stat numbers */
  --font-size-3xl: 28px;     /* Hero stat numbers */
}
```

### Utility-luokat

| Luokka | Koko | Käyttö | Letter-spacing |
|--------|------|--------|----------------|
| `text-caption` | 11px | Badget, kuvatekstit | default |
| `text-body` | 13px | Body-teksti, labelit, napit | default |
| `text-default` | 14px | Standardi teksti | default |
| `text-title` | 16px | Sivuotsikot, korttiotsikot | `-0.02em` |
| `text-heading` | 20px | Hero-otsikot | `-0.02em` |
| `text-stat` | 24px | Tilastonumerot | `-0.02em`, `line-height: 1` |
| `text-hero-stat` | 28px | Hero-tilastonumerot | `-0.02em`, `line-height: 1` |

### Käyttöesimerkit

```tsx
// Sivun otsikko
<h1 className="text-title font-medium">Urheilijat</h1>

// Body-teksti
<p className="text-body text-muted-foreground">Kuvaus tähän</p>

// Badge
<span className="text-caption font-medium">OE</span>

// Tilastonumero (iso)
<span className="text-hero-stat font-medium">12</span>

// Tilastonumero (normaali)
<span className="text-stat font-bold">8:42.15</span>
```

### Fonttipaino

| Elementti | Paino | Luokka |
|-----------|-------|--------|
| Sivuotsikot | 500 | `font-medium` |
| Korttiotsikot | 500 | `font-medium` |
| Tilastonumerot | 500-700 | `font-medium` / `font-bold` |
| Body-teksti | 400 | (default) |
| Labelit | 500 | `font-medium` |

### Tekstivärit (Tailwind-luokat)

| Käyttö | Tailwind-luokka |
|--------|-----------------|
| Pääotsikot | `text-foreground` |
| Alaotsikot/labelit | `text-muted-foreground` |
| Himmennetty | `text-tertiary` |
| Placeholder | `text-[var(--text-placeholder)]` |
| Nimikirjaimet | `text-[var(--text-initials)]` |

### Älä käytä

Älä käytä kovakoodattuja fonttikokoja komponenteissa:

❌ Väärin:
```tsx
<span className="text-[13px]">Teksti</span>
<span className="text-[11px]">Pieni teksti</span>
```

✅ Oikein:
```tsx
<span className="text-body">Teksti</span>
<span className="text-caption">Pieni teksti</span>
```

---

## Layout

### Ikkuna

```
┌─────────────────────────────────────────────────┐
│ TitleBar (h-10)                          [─][□][×] │
├────┬────────────────────────────────────────────┤
│    │                                            │
│ S  │              Main Content                  │
│ i  │              (Outlet)                      │
│ d  │                                            │
│ e  │              padding: 24px (p-6)           │
│ b  │                                            │
│ a  │                                            │
│ r  │                                            │
│    │                                            │
│w-12│                                            │
└────┴────────────────────────────────────────────┘
```

### TitleBar

- Korkeus: `40px` (h-10)
- Custom window controls (minimize, maximize, close)
- Draggable region (`data-tauri-drag-region`)
- Sovelluksen nimi vasemmalla

### Sidebar

- Leveys: `48px` (w-12)
- Ikonipohjainen navigaatio
- Tooltip hover-tilassa
- Aktiivinen tila: sininen palkki vasemmassa reunassa, `text-foreground`
- Inaktiivinen: `text-text-tertiary`

### Navigaatio-ikonit

| Sivu | Ikoni | Label |
|------|-------|-------|
| Etusivu | `Home` | Lähtöviiva |
| Urheilijat | `Users` | Urheilijat |
| Tulokset | `ClipboardList` | Tulokset |
| Kalenteri | `Calendar` | Kalenteri |
| Tilastot | `TrendingUp` | Tilastot |
| Tavoitteet | `Target` | Tavoitteet |
| Kuvat | `Image` | Kuvat |
| Asetukset | `Settings` | Asetukset |

---

## Komponentit

### Painikkeet

#### Primary Button (`.btn-primary`)

```css
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  background: var(--accent);
  color: var(--btn-primary-text);
  border: 1px solid transparent;
  transition: all 150ms;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

#### Secondary Button (`.btn-secondary`)

```css
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: all 150ms;
  cursor: pointer;
}

.btn-secondary:hover {
  color: var(--text-primary);
  background: rgba(128, 128, 128, 0.1);
}
```

#### Dropdown Menu (`.dropdown-menu`)

Keskitetty CSS-luokka kaikille portal-pohjaisille pudotusvalikoille:

```css
.dropdown-menu {
  z-index: 10001;
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: fade-in 0.2s ease-out forwards;
}
```

Käyttö:
```tsx
{isOpen && createPortal(
  <div
    ref={dropdownRef}
    style={dropdownStyle}
    className="dropdown-menu"
  >
    {/* Options */}
  </div>,
  document.body
)}
```

Käytetään komponenteissa:
- `DisciplineSelect` - Lajivalitsin (lomakkeet)
- `DisciplineFilterSelect` - Lajin suodatusvalitsin
- `FilterSelect` - Yleinen suodatusvalitsin
- `AutocompleteInput` - Autocomplete-ehdotukset
- `AddPhotoDialog` - Kilpailuvalitsin

---

### Kortit

**Yhtenäinen hover-malli kaikille korteille:**

```css
/* Kaikki kortit */
transition-colors duration-150
border border-border-subtle hover:border-border-hover
bg-card rounded-xl
```

#### Kortti-komponentit

| Komponentti | Tausta | Border | Hover | Erikoistila |
|-------------|--------|--------|-------|-------------|
| `StatCard` | `bg-card` | `border-border-subtle` | `hover:border-border-hover` | - |
| `AthleteCard` | `bg-card` | `border-border-subtle` | `hover:border-border-hover` | - |
| `CompetitionCard` | `bg-card` | `border-border-subtle` | `hover:border-border-hover` | Menneet: `opacity-60` |
| `ResultCard` | `bg-card` | `border-border-subtle` | `hover:border-border-hover` | - |
| `GoalCard` | `bg-card` | `border-border-subtle` | `hover:border-border-hover` | - |
| `GoalCard` (achieved) | `bg-success/10` | `border-success/30` | `hover:border-success/50` | Vihreä tausta |

#### StatCard

- Tausta: `bg-card`
- Padding: `20px` (p-5)
- Border-radius: `12px` (rounded-xl)
- Ikoni: `text-success`
- Numero: `28px`, `font-medium`, `text-foreground`
- Label: `13px`, `text-muted-foreground`

#### Asetukset-napit (Vie/Tuo tiedot)

Käyttävät samaa tyyliä kuin kortit:
```css
bg-card border border-border-subtle rounded-lg 
hover:border-border-hover transition-colors duration-150
```

---

### Lista- ja taulukko-elementit

**Huom:** Lista- ja taulukkorivit käyttävät eri hover-mallia kuin itsenäiset kortit:

```css
/* Lista/taulukkorivit - taustavärin vaihto */
hover:bg-card-hover transition-colors duration-150

/* Rivien erottelu */
divide-y divide-border-subtle  /* tai */
border-b border-border-subtle
```

Tätä mallia käytetään:
- Dashboard: Tulevat kilpailut -lista
- Dashboard: Viimeisimmät tulokset -taulukko
- Muut taulukkonäkymät

---

### Dialog

```
┌─────────────────────────────────────┐
│ Title                           [×] │  ← Header (px-5 py-4)
├─────────────────────────────────────┤
│                                     │
│           Content                   │  ← Content (p-5)
│                                     │
│                    [Peruuta] [Save] │
└─────────────────────────────────────┘
```

- Backdrop: `bg-[var(--overlay-bg)] backdrop-blur-sm`
- Container: `bg-card rounded-xl shadow-2xl`
- Header border: `border-b border-border-subtle`
- Max-width vaihtoehdot: `sm`, `md`, `lg`, `xl`
- Animaatio: `animate-scale-in`
- Sulkeminen: ESC-näppäin tai backdrop-klikkaus
- Sulkemisnappi: `text-text-tertiary hover:text-foreground hover:bg-muted`

---

### Badge-komponentit

Sovelluksessa on kolme badge-kategoriaa: tietobadget, tilabadget ja aikabadget.

#### 1. Tietobadget (harmaat)

Käytetään metatietojen näyttämiseen. Yhtenäinen hillitty tyyli:

```css
/* Inline-tyyli (ei CSS-luokkaa) */
px-1.5 py-0.5 rounded text-[11px] font-medium
bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]
```

| Badge | Teksti | Käyttö |
|-------|--------|--------|
| Ennätys OE | "OE" | Oma ennätys (Personal Best) |
| Ennätys KE | "KE" | Kauden ennätys (Season Best) |
| Ennätys SE | "SE" | Suomen ennätys (National Record) |
| Kilpailutaso | "SM", "PM", "KLL", "Piiri", "Seura", "Alue", "Muu" | Kilpailun taso |
| Saavutettu | "Saavutettu" (+ Check-ikoni) | Tavoite saavutettu |
| Lähellä | "Lähellä!" | Tavoite lähellä (90-99%) |

#### 2. Tilabadget (värikoodatut)

Käytetään tuloksen tilan näyttämiseen. Suurempi koko:

```css
px-2 py-1 rounded-md text-xs font-medium
```

| Status | Tausta | Teksti | Käyttö |
|--------|--------|--------|--------|
| Päättynyt | `bg-muted` | `text-muted-foreground` | Mennyt kilpailu |
| Hyväksytty | `bg-success/10` | `text-success` | Hyväksytty tulos |
| DNS | `bg-muted` | `text-muted-foreground` | Ei startannut |
| DNF | `bg-warning/10` | `text-warning` | Keskeytti |
| DQ | `bg-error/10` | `text-error` | Hylätty |
| NM | `bg-muted` | `text-muted-foreground` | Ei tulosta |

#### 3. Sijoitusbadget (pyöreät)

Käytetään kilpailusijoituksen näyttämiseen:

```css
/* Pyöreä badge */
inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
```

| Sijoitus | Tausta | Teksti |
|----------|--------|--------|
| 1. (kulta) | `bg-gold` | `text-black` |
| 2. (hopea) | `bg-silver` | `text-black` |
| 3. (pronssi) | `bg-bronze` | `text-white` |
| 4+ | `bg-muted` | `text-muted-foreground` |

#### 4. Aikabadget (värikoodatut)

Käytetään kilpailun kiireellisyyden näyttämiseen:

```css
px-2 py-1 rounded-md text-xs font-medium
```

#### Kilpailun päivämäärä-badge

Käyttää `COMPETITION_URGENCY` vakioita (constants.ts):

| Päivät jäljellä | Tausta | Teksti | Border |
|-----------------|--------|--------|--------|
| 0-3 pv (IMMINENT) | `var(--status-success)/20` | `var(--status-success)` | `var(--status-success)/30` |
| 4-7 pv (SOON) | `var(--status-warning)/15` | `var(--status-warning)` | `var(--status-warning)/25` |
| 8-14 pv (UPCOMING) | `var(--status-orange)/15` | `var(--status-orange)` | `var(--status-orange)/25` |
| 15+ pv | `bg-muted` | `text-muted-foreground` | - |

#### Valittu laji (CompetitionForm)

```css
/* Valittu */
bg-[var(--accent-muted)] text-foreground border-[var(--accent)]

/* Ei valittu */
bg-card border-border hover:border-border-hover
```

---

### Lomake-elementit

#### Input

```css
input, select, textarea {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}

/* Focus state (.input-focus) */
input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-muted);
  outline: none;
}
```

#### Label

```css
label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary); /* text-muted-foreground */
  margin-bottom: 6px;
}
```

#### Error state

- Border: `border-error`
- Virheviesti: `text-[12px] text-error mt-1.5`

---

### Toast-ilmoitukset

Sijainti: oikea alakulma (`bottom-4 right-4`)

| Tyyppi | Tausta | Border | Tekstiväri |
|--------|--------|--------|------------|
| Success | `bg-success/10` | `border-success/30` | `text-success` |
| Error | `bg-error/10` | `border-error/30` | `text-error` |
| Warning | `bg-warning/10` | `border-warning/30` | `text-warning` |
| Info | `bg-[var(--accent)]/10` | `border-[var(--accent)]/30` | `text-[var(--accent)]` |

Ajastus (vakioista `TOAST`):
- Kesto: `TOAST.DURATION_MS` (4000ms)
- Exit-animaatio: `TOAST.EXIT_ANIMATION_MS` (200ms)
- Sulkemisnapin hover: `hover:bg-border-hover`

---

### Empty State

```
        [Icon 48px]

        Title (14px medium)
        Description (13px)

        [Action Button]
```

- Keskitetty sisältö
- Ikoni: `48px`, `text-[var(--text-initials)]`
- Otsikko: `14px`, `text-muted-foreground`
- Kuvaus: `13px`, `text-text-tertiary`
- Animaatio: `animate-fade-in`

---

### Loading State

#### Spinner

- Ikoni: `Loader2` (lucide)
- Animaatio: `animate-spin`
- Väri: `text-text-tertiary`

#### Skeleton

```css
.animate-shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 0%,
    var(--bg-hover) 50%,
    var(--bg-elevated) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

### SegmentedControl

- Yleiskäyttöinen segmentoitu valitsin
- Aktiivinen: `bg-[var(--accent)] text-[var(--btn-primary-text)]`
- Inaktiivinen: `text-muted-foreground hover:text-foreground`

**Huom:** Teemavalitsin on poistettu (vain tumma teema käytössä).

---

### CalendarView (Kalenterinäkymä)

- Tausta: `bg-card rounded-lg p-4`
- Navigointinapit: `text-text-tertiary hover:text-foreground hover:bg-muted`
- Viikonpäivät: `text-text-tertiary text-[11px]`
- Päivät (nykyinen kk): `text-foreground`
- Päivät (muu kk): `text-[var(--text-initials)]`
- Valittu päivä: `bg-muted text-foreground font-medium`
- Tänään (ei valittu): `ring-1 ring-border-hover ring-inset`
- Kilpailupäivän merkki: `bg-[var(--accent)]` tai `bg-[var(--accent)]/60`

---

### Kuvien katselu (PhotoViewer)

Kuvien päällä olevat overlay-elementit käyttävät kiinteitä värejä (ei teemamuuttujia):

- Backdrop: `bg-black/80` tai `bg-[var(--overlay-bg)]`
- Napit kuvan päällä: `bg-black/50 hover:bg-black/70 text-white`
- Hover-overlay kuvien päällä: `bg-black/40`
- Teksti kuvan päällä: `text-white`, `text-white/80`, `text-white/70`

**Syy:** Kuvien päällä tarvitaan aina tumma tausta kontrastin varmistamiseksi riippumatta teemasta.

---

## Animaatiot

### Perusanimaatiot

| Nimi | Kesto | Käyttö |
|------|-------|--------|
| `fade-in` | 0.2s ease-out | Elementtien sisääntulo |
| `slide-up` | 0.25s ease-out | Listat, kortit |
| `scale-in` | 0.15s ease-out | Dialogit |
| `page-enter` | 0.3s ease-out | Sivunvaihdot |
| `shimmer` | 1.5s infinite | Skeleton-loader |
| `glow-pulse` | 2s ease-in-out infinite | Accent-hehku |
| `gold-glow` | 2s ease-in-out infinite | Kulta-hehku |

### Hover-animaatio (kortit)

```css
transition-colors duration-150
```

Kaikki kortit käyttävät yhtenäistä `transition-colors duration-150` animaatiota hover-tilassa.

**Ei käytetä:**
- `transition-all` (liian laaja, voi aiheuttaa suorituskykyongelmia)
- Eri durationeja eri komponenteissa

### Staggered animations

Listoissa käytetään viivästettyä animaatiota:
```tsx
style={{ animationDelay: `${index * 50}ms` }}
```

---

## Ikonit

**Kirjasto:** Lucide React

### Navigaatio

`Home`, `Users`, `ClipboardList`, `Calendar`, `TrendingUp`, `Target`, `Image`, `Settings`

### Toiminnot

| Käyttö | Ikoni |
|--------|-------|
| Lisää | `Plus` |
| Muokkaa | `Edit` / `Pencil` |
| Poista | `Trash2` |
| Sulje | `X` |
| Takaisin | `ArrowLeft` |
| Chevron | `ChevronRight`, `ChevronDown`, `ChevronUp`, `ChevronLeft` |
| Haku | `Search` |

### Tila-ikonit

`CheckCircle`, `XCircle`, `AlertCircle`, `Info`, `Loader2`, `Check`

### Domain-spesifiset

`Trophy`, `Medal`, `Camera`, `User`, `MapPin`, `Calendar`, `Timer`, `BarChart3`, `Target`

---

## Teema

Sovellus käyttää ainoastaan tummaa teemaa. Vaalea teema on poistettu.

CSS-luokka `<html>` -elementissä: `class="dark"`

---

## Värien käyttöohjeet

---

## Tuloksen lisätiedot (Result Details)

### Yleiskuvaus

Tuloksiin voidaan liittää lisätietoja, jotka vaikuttavat tulosten vertailukelpoisuuteen ja OE/KE-laskentaan:

1. **Tuuli** - Tuulilukema (m/s), vaikuttaa OE/KE-kelpoisuuteen ≥14v urheilijoilla
2. **Status** - Tuloksen tila (hyväksytty, NM, DNS, DNF, DQ)
3. **Välinetiedot** - Heittovälineen paino tai aitakorkeus/-väli

### Tuulikenttä (Wind)

Näytetään vain tuulirajoitetuissa lajeissa:
- Pikajuoksut: 60m, 100m, 200m
- Aidat: 60m aj, 80m aj, 100m aj, 110m aj
- Hypyt: pituushyppy, kolmiloikka

```
┌─────────────────────────────────────┐
│ Tuuli                               │
│ ┌─────────────┐                     │
│ │      +1.8   │ m/s                 │
│ └─────────────┘                     │
│ Valinnainen. Myötätuuli +, vasta-.  │
└─────────────────────────────────────┘
```

**Kenttä:**
- Tyyppi: desimaaliluku (REAL)
- Nullable: kyllä (jos ei tiedossa)
- Esimerkki: `+1.8`, `-0.5`, `+2.3`

**Näyttö tuloslistoissa:**
```
10.52 (+1.8)     ← tuuli tiedossa
10.52            ← tuuli ei tiedossa
10.52 (+2.3w)    ← tuuliavusteinen (≥14v, tuuli > +2.0)
```

**Piilotettu logiikka (≥14v urheilijat):**
- Jos tuuli > +2.0 m/s ja laji on tuulirajoitettu:
  - Tulos **ei voi olla OE tai KE**
  - Näytetään `w`-merkintä tuloksen perässä
- Alle 14-vuotiailla ei rajoituksia (lasten säännöt)

---

### Tuloksen status (Result Status)

```
┌─────────────────────────────────────┐
│ Status                              │
│                                     │
│ ◉ Hyväksytty                        │
│ ○ NM - Ei tulosta                   │
│ ○ DNS - Ei startannut               │
│ ○ DNF - Keskeytti                   │
│ ○ DQ - Hylätty                      │
└─────────────────────────────────────┘
```

| Status | Selite | Tulos-arvo |
|--------|--------|------------|
| `valid` | Hyväksytty tulos | Pakollinen |
| `nm` | No Mark - ei hyväksyttyä suoritusta (esim. kaikki hypyt yliastuttu) | NULL tai 0 |
| `dns` | Did Not Start - ei startannut (esim. sairastui) | NULL |
| `dnf` | Did Not Finish - keskeytti | NULL |
| `dq` | Disqualified - hylätty sääntörikkomuksesta | NULL |

**UI-käyttäytyminen:**
- Oletus: `valid` (hyväksytty)
- Kun status ≠ `valid`, tulos-kenttä on valinnainen/harmaana
- Tuloskorteissa näytetään status-badge:

```css
/* NM/DNS/DNF/DQ badge */
.badge-status {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
```

---

### Välinetiedot (Equipment Details)

#### Heittovälineen paino

Näytetään heittolajeissa: kuula, kiekko, keihäs, moukari.

```
┌─────────────────────────────────────┐
│ Välineen paino                      │
│ ┌───────────────────────────────┐   │
│ │ 2 kg                        ▼ │   │
│ └───────────────────────────────┘   │
│                                     │
│ Vaihtoehdot:                        │
│ • Kuula: 2, 2.5, 3, 4, 5, 6, 7.26 kg│
│ • Kiekko: 0.75, 1, 1.5, 1.75, 2 kg  │
│ • Keihäs: 400, 500, 600, 700, 800 g │
│ • Moukari: 3, 4, 5, 6, 7.26 kg      │
└─────────────────────────────────────┘
```

**Vakiopainot lajeittain:**

| Laji | Painot |
|------|--------|
| Kuula | 2 kg, 2.5 kg, 3 kg, 4 kg, 5 kg, 6 kg, 7.26 kg |
| Kiekko | 0.75 kg, 1 kg, 1.5 kg, 1.75 kg, 2 kg |
| Keihäs | 400 g, 500 g, 600 g, 700 g, 800 g |
| Moukari | 3 kg, 4 kg, 5 kg, 6 kg, 7.26 kg |

#### Aitakorkeus ja -väli

Näytetään aitalajeissa.

```
┌─────────────────────────────────────┐
│ Aidan korkeus                       │
│ ┌───────────────────────────────┐   │
│ │ 76 cm                       ▼ │   │
│ └───────────────────────────────┘   │
│                                     │
│ Aitaväli (valinnainen)              │
│ ┌─────────────┐                     │
│ │        8.0  │ m                   │
│ └─────────────┘                     │
└─────────────────────────────────────┘
```

**Vakiokorkeudet:**

| Korkeus | Käyttö |
|---------|--------|
| 50 cm | Nuorimmat |
| 60 cm | T/P 10-11 |
| 68 cm | T 12-13 |
| 76 cm | T 14-15, P 12-13 |
| 84 cm | T 16-17, P 14-15 |
| 91 cm | N, P 16-17 |
| 100 cm | M 18-19 |
| 106 cm | M |

---

### OE/KE per väline

Kun välinetieto on käytössä, OE/KE lasketaan **erikseen jokaiselle välineelle**.

**Esimerkki: Kuulantyöntö**

```
┌─────────────────────────────────────┐
│ Kuula - Ennätykset                  │
├─────────────────────────────────────┤
│ 2 kg      OE  6.50 m   (12.5.2024)  │
│ 2.5 kg    OE  7.20 m   (3.8.2025)   │
│ 3 kg      —  ei tuloksia            │
└─────────────────────────────────────┘
```

**Logiikka:**
1. Tulos tallennetaan aina välinetiedon kanssa (pakollinen heitoissa/aidoissa)
2. OE haetaan: paras tulos **samalla välineellä**
3. KE haetaan: paras tulos **samalla välineellä tänä vuonna**
4. Eri välineiden tuloksia ei vertailla keskenään

**Urheilijan profiilissa:**

Näytetään ennätykset ryhmiteltynä välineittäin:

```
Kuulantyöntö
├── 2 kg:    OE 6.50m │ KE 6.30m
├── 2.5 kg:  OE 7.20m │ KE 7.20m
└── 3 kg:    — ei tuloksia —

60m aitajuoksu
├── 60 cm:   OE 12.34 │ KE 12.45
└── 68 cm:   OE 13.01 │ KE 13.01
```

---

### ResultForm - Kenttien näkyvyys

| Laji | Tuuli | Status | Paino | Korkeus | Väli |
|------|-------|--------|-------|---------|------|
| Pikajuoksut (60-200m) | ✓ | ✓ | - | - | - |
| Keskimatkat (400m+) | - | ✓ | - | - | - |
| Aidat | ✓ | ✓ | - | ✓ | (✓) |
| Pituus, kolmiloikka | ✓ | ✓ | - | - | - |
| Korkeus, seiväs | - | ✓ | - | - | - |
| Heitot | - | ✓ | ✓ | - | - |
| Yhdistetyt | - | ✓ | - | - | - |

---

### Tietokantamuutokset

```sql
-- Results-tauluun lisättävät sarakkeet
ALTER TABLE results ADD COLUMN wind REAL;           -- Tuulilukema (m/s)
ALTER TABLE results ADD COLUMN status TEXT DEFAULT 'valid';  -- valid/nm/dns/dnf/dq
ALTER TABLE results ADD COLUMN equipment_weight REAL;  -- Välineen paino (kg)
ALTER TABLE results ADD COLUMN hurdle_height INTEGER;  -- Aitakorkeus (cm)
ALTER TABLE results ADD COLUMN hurdle_spacing REAL;    -- Aitaväli (m)
```

---

### Älä käytä kovakoodattuja värejä

❌ Väärin:
```tsx
<div className="bg-[#141414] text-[#888888]">
```

✅ Oikein:
```tsx
<div className="bg-card text-muted-foreground">
```

### Poikkeukset

Seuraavissa tapauksissa kovakoodatut värit ovat sallittuja:

1. **Kuvien päällä olevat overlayt** - Tarvitsevat aina tumman taustan:
   ```tsx
   <div className="bg-black/50 text-white">
   ```

2. **CSS-muuttujien käyttö Tailwindissa** - Kun tarvitaan opacity:
   ```tsx
   <div className="bg-[var(--accent)]/10 border-[var(--accent)]/30">
   ```
