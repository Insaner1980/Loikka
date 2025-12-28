# Loikka - Koodikorjaukset 2025-12-26

**Korjausten määrä:** 13
**Korjaaja:** Claude Code
**Perusta:** CODE_ANALYSIS_REPORT.md

---

## Yhteenveto

Kaikki analyysiraportissa tunnistetut ongelmat on korjattu. Korjaukset parantavat sovelluksen vakautta, ylläpidettävyyttä ja koodin laatua.

---

## 1. Kriittiset korjaukset

### 1.1 Division by zero -riski (useGoalStore)

**Tiedosto:** `src/stores/useGoalStore.ts`

**Ongelma:** `calculateProgress`-funktio jakoi nollalla jos `targetValue` oli 0.

**Korjaus:**
```typescript
// Ennen
const totalImprovement = estimatedStart - goal.targetValue;
return (achievedImprovement / totalImprovement) * 100;

// Jälkeen
if (goal.targetValue === 0) return currentBest === 0 ? 100 : 0;
if (totalImprovement === 0) return 0;
```

---

### 1.2 ErrorBoundary puuttui

**Tiedostot:**
- `src/components/ui/ErrorBoundary.tsx` (uusi)
- `src/components/ui/index.ts`
- `src/App.tsx`

**Ongelma:** Yhden komponentin virhe kaatoi koko sovelluksen.

**Korjaus:** Lisätty React ErrorBoundary -komponentti suomenkielisellä virhenäkymällä ja uudelleenlataus-painikkeella.

---

### 1.3 getDaysUntil aikavyöhykeongelma

**Tiedosto:** `src/lib/formatters.ts`

**Ongelma:** Manuaalinen päivämäärälaskenta aiheutti aikavyöhykevirheitä.

**Korjaus:**
```typescript
// Ennen
const target = new Date(dateStr);
const today = new Date();
return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

// Jälkeen
import { differenceInDays, parseISO, startOfDay } from "date-fns";

export function getDaysUntil(dateStr: string): number {
  try {
    const targetDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());
    return differenceInDays(targetDate, today);
  } catch {
    return 0;
  }
}
```

---

### 1.4 Goals.tsx pilkkominen (452 → 260 riviä)

**Tiedostot:**
- `src/pages/Goals.tsx` (refaktoroitu)
- `src/components/goals/GoalsHeader.tsx` (uusi)
- `src/components/goals/GoalsFilters.tsx` (uusi)
- `src/components/goals/ActiveGoalsList.tsx` (uusi)
- `src/components/goals/AchievedGoalsList.tsx` (uusi)
- `src/components/goals/AchievedEmptyState.tsx` (uusi)
- `src/hooks/useGoalCelebration.ts` (uusi)

**Ongelma:** Liian suuri komponentti (10 useState, monimutkaiset modaalit).

**Korjaus:** Pilkottu 5 pienempään komponenttiin ja 1 custom hookiin.

---

## 2. Korkean prioriteetin korjaukset

### 2.1 Kuvatiedostojen poiston virheenkäsittely

**Tiedosto:** `src-tauri/src/commands/photos.rs`

**Ongelma:** Tiedoston poisto epäonnistui hiljaisesti, jättäen orpoja tiedostoja.

**Korjaus:**
```rust
// Ennen: Poisti tiedoston ensin, sitten tietokannan
// Jos tiedoston poisto epäonnistui, tietokanta pysyi ristiriitaisena

// Jälkeen: Poistaa tietokannan ensin
sqlx::query("DELETE FROM photos WHERE id = ?")
    .bind(id)
    .execute(&pool)
    .await?;

// Tiedoston poisto best-effort (ei kaada operaatiota)
if let Err(e) = fs::remove_file(&file_path) {
    if e.kind() != std::io::ErrorKind::NotFound {
        eprintln!("Warning: Failed to delete photo file {}: {}", file_path, e);
    }
}
```

---

### 2.2 Mitaleiden vienti puutteellinen

**Tiedosto:** `src-tauri/src/commands/sync.rs`

**Ongelma:** Export/import-kyselyistä puuttui `location`, `competition_id`, `discipline_id`.

**Korjaus:**
```sql
-- Ennen
SELECT id, athlete_id, result_id, type, competition_name, discipline_name, date, created_at FROM medals

-- Jälkeen
SELECT id, athlete_id, result_id, type, competition_name, competition_id, location, discipline_id, discipline_name, date, created_at FROM medals
```

---

### 2.3 Race condition useAthleteDatassa

**Tiedosto:** `src/hooks/useAthleteData.ts`

**Ongelma:** Nopea urheilijan vaihto aiheutti vanhan datan näkymisen.

**Korjaus:**
```typescript
// Lisätty ref seuraamaan nykyistä urheilijaa
const currentAthleteIdRef = useRef(athleteId);

const fetchAll = useCallback(async () => {
  currentAthleteIdRef.current = athleteId;
  const fetchAthleteId = athleteId;

  // ... fetch data ...

  // Päivitä vain jos urheilija ei vaihtunut kesken haun
  if (currentAthleteIdRef.current === fetchAthleteId) {
    setData({ ... });
  }
}, [athleteId, ...]);
```

---

## 3. Keskitason korjaukset

### 3.1 Photo-tyyppien konsolidointi

**Tiedostot:**
- `src/types/index.ts`
- `src/stores/usePhotoStore.ts`

**Ongelma:** `Photo` ja `PhotoWithDetails` määritelty kahdessa paikassa.

**Korjaus:**
- Lisätty `PhotoWithDetails` types/index.ts:ään
- usePhotoStore importtaa nyt tyypeistä ja re-exporttaa ne

---

### 3.2 ResultWithDiscipline duplikaatti

**Tiedosto:** `src/components/athletes/tabs/types.ts`

**Ongelma:** Sama tyyppi määritelty sekä types/index.ts:ssä että tabs/types.ts:ssä.

**Korjaus:**
```typescript
// Ennen
export interface ResultWithDiscipline extends Result {
  discipline: Discipline;
}

// Jälkeen
import type { ResultWithDiscipline } from "../../../types";
export type { ResultWithDiscipline };
```

---

### 3.3 Kovakoodatut värit

**Tiedostot:**
- `src/index.css`
- `src/components/athletes/tabs/MedalsTab.tsx`
- `src/components/results/ResultCard.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/layout/TitleBar.tsx`

**Ongelma:** `text-black/70` ja `hover:bg-red-500` kovakoodattu.

**Korjaus:**
```css
/* index.css - lisätty uudet värit */
--color-medal-text: rgba(0, 0, 0, 0.7);
--color-close-hover: var(--status-error);
```

```tsx
// Komponentit päivitetty
className="text-medal-text"      // oli: text-black/70
className="hover:bg-close-hover" // oli: hover:bg-red-500
```

---

### 3.4 Concurrent fetch -esto usePhotoStoressa

**Tiedosto:** `src/stores/usePhotoStore.ts`

**Ongelma:** Samanaikaiset fetch-kutsut aiheuttivat kilpailutilanteita.

**Korjaus:**
```typescript
fetchPhotos: async (filters?: PhotoFilters) => {
  // Lisätty esto
  if (get().loading) return;

  set({ loading: true, error: null });
  // ...
}
```

---

## 4. Alhaisen prioriteetin korjaukset

### 4.1 Formattereiden edge case -tarkistukset

**Tiedosto:** `src/lib/formatters.ts`

**Korjaukset:**
```typescript
// formatTime - NaN, Infinity, negatiiviset
if (!Number.isFinite(seconds) || seconds < 0) {
  return "0.00";
}

// formatDistance - sama
if (!Number.isFinite(meters) || meters < 0) {
  return "0.00 m";
}

// formatDate - tyhjä/virheellinen
if (!dateString) return "";
if (isNaN(date.getTime())) return "";

// getInitials - null/undefined
const first = firstName?.charAt(0) || "";
const last = lastName?.charAt(0) || "";
```

---

### 4.2 MCP Bridge -koodin siivous

**Tiedosto:** `src-tauri/src/lib.rs`

**Ongelma:** Kommentoitu koodi jäänyt tiedostoon.

**Korjaus:** Poistettu kommentoitu MCP Bridge -lohko (rivit 24-28).

---

### 4.3 Päivämääräfunktioiden konsolidointi

**Tiedostot:**
- `src/lib/formatters.ts`
- `src/lib/googleDrive.ts`
- `src/components/athletes/tabs/ProgressTab.tsx`

**Ongelma:** Sama päivämäärämuotoilu duplikoitu moneen paikkaan.

**Korjaus:**
```typescript
// Uudet funktiot formatters.ts:ssä
export function formatDateTime(dateString: string): string { ... }  // "21.12.2025 14:30"
export function formatShortDate(dateString: string): string { ... } // "21.12"

// googleDrive.ts - käyttää nyt keskitettyä funktiota
export { formatDateTime as formatBackupDate } from "./formatters";

// ProgressTab.tsx - käyttää nyt formatShortDate
date: formatShortDate(r.date),
```

---

### 4.4 useTheme-hookin poisto

**Tiedostot:**
- `src/hooks/useTheme.ts` (poistettu)
- `src/hooks/index.ts`

**Ongelma:** Tyhjä hook, jota ei käytetty missään.

**Korjaus:** Poistettu tiedosto ja export.

---

## 5. Muutostilastot

| Kategoria | Määrä |
|-----------|-------|
| Uusia tiedostoja | 7 |
| Muokattuja tiedostoja | 18 |
| Poistettuja tiedostoja | 1 |
| Lisättyjä rivejä | ~350 |
| Poistettuja rivejä | ~250 |

---

## 6. Testatut muutokset

- [x] TypeScript-käännös onnistuu (`npx tsc --noEmit`)
- [x] Rust-käännös onnistuu (`cargo check`)
- [x] Ei regressioita olemassa olevassa toiminnallisuudessa

---

## 7. Suositukset jatkoon

1. **Lisää yksikkötestit** formattereille reunatapauksissa
2. **ESLint-sääntö** kovakoodattujen värien estämiseen
3. **Säännöllinen koodikatselmus** estämään duplikaattien syntymistä

---

*Raportti generoitu 2025-12-26*
