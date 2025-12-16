# Loikka UI Komponentit

Tämä dokumentaatio kuvaa Loikka-sovelluksen UI-komponentit ja niiden käyttötavat.

## Värit

### Brand-värit
- `primary` - Keltainen (#FDF200) - Pääväri, korostukset
- `secondary` - Sininen (#2700FF) - Toissijainen väri

### Semanttiset värit
- `gold` - Kultamitali (#FFD700)
- `silver` - Hopeamitali (#C0C0C0)
- `bronze` - Pronssimitali (#CD7F32)

### Taustavärit
- `background` - Sovelluksen tausta
- `card` - Korttien tausta
- `muted` - Himmennetty tausta

### Tekstivärit
- `foreground` - Pääteksti
- `muted-foreground` - Toissijainen teksti

### Reunat
- `border` - Reunaviivat

---

## Komponentit

### Dialog

Modal-ikkuna lomakkeille ja vahvistuksille.

```tsx
import { Dialog } from "@/components/ui";

<Dialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Otsikko"
  maxWidth="md" // "sm" | "md" | "lg" | "xl"
>
  <p>Sisältö tähän</p>
</Dialog>
```

**Props:**
| Prop | Tyyppi | Pakollinen | Oletus | Kuvaus |
|------|--------|------------|--------|--------|
| open | boolean | Kyllä | - | Näytetäänkö dialogi |
| onClose | () => void | Kyllä | - | Sulkemisfunktio |
| title | string | Kyllä | - | Dialogin otsikko |
| children | ReactNode | Kyllä | - | Sisältö |
| maxWidth | "sm" \| "md" \| "lg" \| "xl" | Ei | "md" | Maksimileveys |

---

### Tooltip

Hover-vihje elementeille.

```tsx
import { Tooltip } from "@/components/ui";

<Tooltip content="Vihjeteksti" side="right">
  <button>Hover me</button>
</Tooltip>
```

**Props:**
| Prop | Tyyppi | Pakollinen | Oletus | Kuvaus |
|------|--------|------------|--------|--------|
| content | string | Kyllä | - | Vihjeteksti |
| children | ReactNode | Kyllä | - | Kohde-elementti |
| side | "top" \| "right" \| "bottom" \| "left" | Ei | "right" | Sijainti |

---

## Shared-komponentit

### StatCard

Tilastokortti numeroarvoille.

```tsx
import { StatCard } from "@/components/shared";
import { Trophy } from "lucide-react";

<StatCard
  icon={<Trophy size={24} />}
  value={42}
  label="Tuloksia"
  highlight={false}
/>
```

**Props:**
| Prop | Tyyppi | Pakollinen | Oletus | Kuvaus |
|------|--------|------------|--------|--------|
| icon | ReactNode | Kyllä | - | Ikoni |
| value | string \| number | Kyllä | - | Arvo |
| label | string | Kyllä | - | Selite |
| highlight | boolean | Ei | false | Korostus (keltainen tausta) |

---

## Athlete-komponentit

### AthleteCard

Urheilijan kortti listanäkymään.

```tsx
import { AthleteCard } from "@/components/athletes";

<AthleteCard
  athlete={athlete}
  stats={stats}
/>
```

### AthleteForm

Urheilijan lisäys/muokkauslomake.

```tsx
import { AthleteForm } from "@/components/athletes";

<AthleteForm
  athlete={existingAthlete} // undefined = lisäys
  onSave={(data) => handleSave(data)}
  onCancel={() => closeForm()}
/>
```

### AthleteStats

Urheilijan tilastorivi.

```tsx
import { AthleteStats } from "@/components/athletes";

<AthleteStats
  resultsCount={42}
  personalBestsCount={8}
  medalsCount={6}
  goalsProgress={{ achieved: 3, total: 5 }}
/>
```

### AthleteTabs

Välilehtinavigaatio urheilijan sivulle.

```tsx
import { AthleteTabs, type AthleteTab } from "@/components/athletes";

const [activeTab, setActiveTab] = useState<AthleteTab>("records");

<AthleteTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

**Välilehdet:**
- `records` - Ennätykset
- `results` - Tulokset
- `medals` - Mitalit
- `progress` - Kehitys
- `goals` - Tavoitteet

---

## Result-komponentit

### ResultBadge

Ennätysmerkki (SE/KE).

```tsx
import { ResultBadge } from "@/components/results";

<ResultBadge type="pb" /> // SE - Ennätys
<ResultBadge type="sb" /> // KE - Kauden ennätys
```

### ResultForm

Tuloksen lisäyslomake.

```tsx
import { ResultForm } from "@/components/results";

<ResultForm
  athleteId={1} // Esivalittu urheilija (valinnainen)
  onSave={(result, medal) => handleSave(result, medal)}
  onCancel={() => closeForm()}
/>
```

---

## Layout-komponentit

### Sidebar

Sivupalkki navigaatiolle.

```tsx
import { Sidebar } from "@/components/layout";

<Sidebar />
```

### Layout

Päälayout Outlet-alueella.

```tsx
import { Layout } from "@/components/layout";

<Route element={<Layout />}>
  <Route path="/" element={<Dashboard />} />
</Route>
```

### SidebarIcon

Navigaatioikoni tooltipilla.

```tsx
import { SidebarIcon } from "@/components/layout";
import { Home } from "lucide-react";

<SidebarIcon
  to="/"
  icon={Home}
  label="Etusivu"
/>
```

---

## Tailwind-luokat

### Yleiset painikkeet

```tsx
// Pääpainike (keltainen)
<button className="px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-colors">
  Tallenna
</button>

// Toissijainen painike (reunus)
<button className="px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors">
  Peruuta
</button>

// Ikonipainike
<button className="p-2 rounded-lg hover:bg-muted transition-colors">
  <Icon size={20} />
</button>
```

### Lomakekentät

```tsx
// Tekstikenttä
<input
  type="text"
  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
/>

// Virheellinen kenttä
<input
  className="... border-red-500"
/>

// Dropdown
<select className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
  <option>Vaihtoehto</option>
</select>
```

### Kortit

```tsx
// Peruskortti
<div className="p-4 bg-card rounded-xl border border-border">
  Sisältö
</div>

// Hover-efektillä
<div className="p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors">
  Klikattava
</div>
```

---

## Ikonit

Käytämme [Lucide React](https://lucide.dev/icons/) -ikonikirjastoa.

```tsx
import {
  Home,       // Etusivu
  Users,      // Urheilijat
  Trophy,     // Tulokset/Mitalit
  Calendar,   // Kalenteri
  BarChart3,  // Tilastot
  Target,     // Tavoitteet
  Settings,   // Asetukset
  Plus,       // Lisää
  Edit,       // Muokkaa
  X,          // Sulje
  ArrowLeft,  // Takaisin
  Star,       // Kauden ennätys
  Medal,      // Mitali
  User,       // Käyttäjä/Profiili
  Camera,     // Kuva
  CheckCircle // Valmis
} from "lucide-react";

<Icon size={20} className="text-muted-foreground" />
```
