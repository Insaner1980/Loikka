# Loikka - UI Specification

Tämä dokumentti määrittelee Loikka-sovelluksen käyttöliittymän suunnitteluperiaatteet ja komponentit.

## Design Philosophy

**Linear-tyylinen premium dark theme** - Minimalistinen, elegantti ja ammattimainen ulkoasu.

Periaatteet:
- Hillityt värit, vahva kontrasti tekstissä
- Lähes näkymättömät reunat
- Hienovaraiset animaatiot
- Selkeä hierarkia
- Toiminnallisuus ennen koristeita

## Väripaletti

### Taustat

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--bg-base` | `#0A0A0A` | Sovelluksen päätausta |
| `--bg-surface` | `#111111` | Kortit ja pinnat |
| `--bg-elevated` | `#191919` | Korotetut elementit |
| `--bg-hover` | `#1a1a1a` | Hover-tila |

### Reunat

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--border-subtle` | `rgba(255,255,255,0.04)` | Hienovarainen erottelu |
| `--border-default` | `rgba(255,255,255,0.06)` | Oletusreuna |
| `--border-hover` | `rgba(255,255,255,0.1)` | Hover-tila |

### Teksti

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--text-primary` | `#E8E8E8` | Pääasiallinen teksti |
| `--text-secondary` | `#888888` | Toissijainen teksti |
| `--text-muted` | `#555555` | Himmennetty teksti |

### Tilavärit

| Muuttuja | Arvo | Käyttö |
|----------|------|--------|
| `--color-success` | `#4ADE80` | Onnistuminen, SE-badge |
| `--color-warning` | `#FACC15` | Varoitus, KE-badge |
| `--color-error` | `#EF4444` | Virhe |

### Mitalit

| Muuttuja | Arvo |
|----------|------|
| `--color-gold` | `#FFD700` |
| `--color-silver` | `#C0C0C0` |
| `--color-bronze` | `#CD7F32` |

## Typografia

**Fontti:** Inter (system fallback: -apple-system, BlinkMacSystemFont, Segoe UI)

### Koot

| Elementti | Koko | Paino | Letter-spacing |
|-----------|------|-------|----------------|
| Sivun otsikko | `16px` (text-base) | `500` (medium) | `-0.02em` |
| Osion otsikko | `13px` | `500` (medium) | `-0.01em` |
| Body text | `14px` | `400` (normal) | `-0.01em` |
| Secondary text | `13px` | `400` (normal) | `-0.01em` |
| Muted/label | `12-13px` | `400-500` | normal |
| Numero (tilasto) | `28px` | `500` (medium) | `-0.02em` |

### Värit tekstissä

- Pääotsikot: `text-foreground` (#E8E8E8)
- Alaotsikot: `text-[#888888]`
- Labelit: `text-[#666666]`
- Placeholder/disabled: `text-[#555555]`

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
- Aktiivinen tila: `bg-white/5`, `text-foreground`
- Inaktiivinen: `text-[#555555]`

### Navigaatio-ikonit

| Sivu | Ikoni | Label |
|------|-------|-------|
| Etusivu | `Home` | Etusivu |
| Urheilijat | `Users` | Urheilijat |
| Tulokset | `ClipboardList` | Tulokset |
| Kalenteri | `Calendar` | Kalenteri |
| Tilastot | `TrendingUp` | Tilastot |
| Tavoitteet | `Target` | Tavoitteet |
| Kuvat | `Image` | Kuvat |
| Asetukset | `Settings` | Asetukset |

## Komponentit

### Painikkeet

#### Primary Button

```css
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}
```

#### Secondary Button

```css
.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}

.btn-secondary:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}
```

### Kortit

#### Peruskortti

```css
.card {
  padding: 16px;
  border-radius: 8px;
  background: #141414;
}

.card:hover {
  background: #191919;
}
```

#### StatCard

- Tausta: `#141414`
- Padding: `20px` (p-5)
- Border-radius: `12px` (rounded-xl)
- Numero: `28px`, `font-medium`
- Label: `13px`, `#666666`

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

- Backdrop: `bg-black/70 backdrop-blur-sm`
- Container: `bg-[#141414] rounded-xl`
- Max-width vaihtoehdot: `sm`, `md`, `lg`, `xl`
- Animaatio: `animate-scale-in`
- Sulkeminen: ESC-näppäin tai backdrop-klikkaus

### Badge-komponentit

#### SE (Personal Best)

```css
.badge-pb {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.1);
  color: #4ADE80;
}
```

#### KE (Season Best)

```css
.badge-sb {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: rgba(250, 204, 21, 0.1);
  color: #FACC15;
}
```

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

input:focus {
  border-color: var(--border-hover);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
  outline: none;
}
```

#### Label

```css
label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #888888;
  margin-bottom: 6px;
}
```

#### Error state

- Border: `border-error` (red)
- Virheviesti: `text-[12px] text-error mt-1.5`

### Toast-ilmoitukset

Sijainti: oikea alakulma (`bottom-4 right-4`)

| Tyyppi | Taustaväri | Reunaväri | Ikoni |
|--------|------------|-----------|-------|
| Success | `green-500/10` | `green-500/30` | `CheckCircle` |
| Error | `red-500/10` | `red-500/30` | `XCircle` |
| Warning | `yellow-500/10` | `yellow-500/30` | `AlertCircle` |
| Info | `blue-500/10` | `blue-500/30` | `Info` |

- Kesto: 4 sekuntia (oletusarvo)
- Animaatio: slide in/out

### Empty State

```
        [Icon 48px]

        Title (14px medium)
        Description (13px)

        [Action Button]
```

- Keskitetty sisältö
- Ikoni: `48px`, `#444444`
- Otsikko: `14px`, `#666666`
- Kuvaus: `13px`, `#555555`
- Animaatio: `animate-fade-in`

### Loading State

#### Spinner

- Ikoni: `Loader2` (lucide)
- Animaatio: `animate-spin`
- Väri: `#555555`

#### PageLoader

- Spinner + teksti "Ladataan..."
- Keskitetty pysty- ja vaakasuunnassa
- Padding: `py-16`

#### Skeleton

```css
.skeleton {
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

## Animaatiot

### fade-in

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Kesto: 0.2s ease-out */
```

### slide-up

```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Kesto: 0.25s ease-out */
```

### scale-in

```css
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
/* Kesto: 0.15s ease-out */
```

### Button press

```css
.btn-press:active {
  transform: scale(0.98);
}
```

### Staggered animations

Listoissa käytetään viivästettyä animaatiota:
```tsx
style={{ animationDelay: `${index * 50}ms` }}
```

## Ikonit

**Kirjasto:** Lucide React

### Yleiset ikonit

| Käyttö | Ikoni |
|--------|-------|
| Lisää | `Plus` |
| Muokkaa | `Edit` |
| Poista | `Trash2` |
| Sulje | `X` |
| Takaisin | `ArrowLeft` |
| Chevron | `ChevronRight` |
| Haku | `Search` |

### Navigaatio-ikonit

`Home`, `Users`, `ClipboardList`, `Calendar`, `TrendingUp`, `Target`, `Image`, `Settings`

### Tila-ikonit

`CheckCircle`, `XCircle`, `AlertCircle`, `Info`, `Loader2`

### Domain-spesifiset

`Trophy`, `Medal`, `Camera`, `User`, `MapPin`, `BarChart3`

## Responsiivisuus

### Breakpointit

| Breakpoint | Leveys | Käyttö |
|------------|--------|--------|
| `md` | `768px` | Tablet |
| `lg` | `1024px` | Desktop |

### Grid-layoutit

```css
/* Urheilijat-grid */
.athletes-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 12px;
}

@media (min-width: 768px) {
  .athletes-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .athletes-grid { grid-template-columns: repeat(3, 1fr); }
}
```

## Accessibility

- Kaikki interaktiiviset elementit: `aria-label` suomeksi
- Focus ring: `focus:ring-1 focus:ring-white/10`
- Keyboard navigation: ESC sulkee dialogit
- Riittävä kontrasti tekstissä
- `role="dialog"` ja `aria-modal="true"` dialogeissa

## Pikanäppäimet

| Näppäin | Toiminto |
|---------|----------|
| `Ctrl+N` | Lisää uusi (kontekstista riippuen) |
| `Escape` | Sulje dialog |

## Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}
```
