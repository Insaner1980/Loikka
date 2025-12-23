# Loikka - Koodianalyysin löydökset

Tämä dokumentti sisältää kattavan koodianalyysin tulokset. Käytä tätä referenssinä tulevissa kehitystehtävissä.

---

## KORJATUT ONGELMAT

### 1. Debug-lokitus (KORJATTU)
**Tiedosto:** `src/pages/AthleteDetail.tsx:195`
```typescript
// POISTETTU:
console.log("Loaded medals:", medalsData);
```

### 2. Kovakoodatut fonttikoot (KORJATTU)
Kaikki `text-[11px]` korvattu `text-caption`-luokalla:
- `src/components/competitions/CompetitionCard.tsx:30, 52`
- `src/components/goals/GoalCard.tsx:61, 67`
- `src/pages/AthleteDetail.tsx:1109`

### 3. Turha funktio (KORJATTU)
**Tiedosto:** `src/pages/Dashboard.tsx`
```typescript
// ENNEN - funktio joka ei käytä parametriaan:
function getDaysUntilColor(_days: number): string {
  return "bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]";
}

// JÄLKEEN - yksinkertainen vakio:
const DAYS_BADGE_STYLE = "bg-transparent text-[var(--text-muted)] border border-[var(--border-hover)]";
```

### 4. Kovakoodatut tuuliarvot (KORJATTU)
**Tiedosto:** `src/lib/formatters.ts`
```typescript
// ENNEN:
if (age >= 14 && wind > 2.0)

// JÄLKEEN:
if (age >= WIND.AGE_THRESHOLD && wind > WIND.LIMIT)
```

### 5. Käyttämättömät tyypit (KORJATTU)
**Tiedosto:** `src/types/index.ts`
Poistettu:
- `ResultWithDetails`
- `GoalWithDetails`
- `MedalWithDetails`

---

## HYVÄKSYTYT CONSOLE.ERROR-VIESTIT

Nämä ovat tarpeellisia virheenkäsittelyä, EI poisteta:

| Tiedosto | Rivi | Viesti |
|----------|------|--------|
| `src/hooks/usePhotos.ts` | 151 | `"Failed to fetch photo count:"` |
| `src/stores/useResultStore.ts` | 70 | `"Error checking goals:"` |
| `src/stores/useResultStore.ts` | 282 | `"Failed to check personal best:"` |
| `src/stores/useResultStore.ts` | 321 | `"Failed to check season best:"` |
| `src/stores/usePhotoStore.ts` | 76 | `"Failed to fetch photo years:"` |
| `src/stores/useCompetitionStore.ts` | 218 | `"Failed to add participant:"` |
| `src/stores/useCompetitionStore.ts` | 236 | `"Failed to remove participant:"` |
| `src/stores/useAthleteStore.ts` | 97 | `"Failed to save athlete photo:"` |
| `src/stores/useAthleteStore.ts` | 169 | `"Failed to fetch athlete results:"` |
| `src/stores/useAthleteStore.ts` | 187 | `"Failed to fetch personal bests:"` |
| `src/stores/useAthleteStore.ts` | 199 | `"Failed to fetch medals:"` |
| `src/stores/useAthleteStore.ts` | 211 | `"Failed to fetch goals:"` |

---

## RUST-BACKEND LÖYDÖKSET

### Tarkoitukselliset mallit (EI KORJATA)

#### 1. `.unwrap_or(false)` migraatioissa
**Tiedosto:** `src-tauri/src/database.rs`
**Rivit:** 162, 177, 236, 260, 283, 298, 313, 328, 343, 367, 393

**Selitys:** Migraatiotarkistukset käyttävät `.unwrap_or(false)` tarkoituksella. Jos tarkistus epäonnistuu, oletetaan ettei migraatio ole vielä ajettu, ja se ajetaan. Tämä on turvallinen fallback.

```rust
// Esimerkki - TARKOITUKSELLINEN:
let has_column = sqlx::query("SELECT ...")
    .fetch_optional(&pool)
    .await
    .map(|r| r.is_some())
    .unwrap_or(false);  // Jos virhe, oleta ettei saraketta ole
```

#### 2. Hardcoded vuosi 2024
**Tiedosto:** `src-tauri/src/commands/results.rs`
**Rivit:** 128-129, 479, 728, 816, 916

**Selitys:** Fallback-vuosi jos päivämäärän parsinta epäonnistuu. Käytetään vain edge case -tilanteissa.

```rust
let year = date.split('-').next()
    .and_then(|y| y.parse().ok())
    .unwrap_or(2024);  // Fallback jos parsinta epäonnistuu
```

**Mahdollinen parannus:** Voisi käyttää `chrono::Local::now().year()` mutta vaatisi lisäriippuvuuden.

#### 3. Suorituskyky - N+1 kyselyt
**Tiedosto:** `src-tauri/src/commands/athletes.rs:7-48`

**Selitys:** `get_all_athletes()` käyttää subkyselyitä SELECT:ssä. Tämä on hyväksyttävää koska:
- Sovellus on suunniteltu pienelle datamäärälle (1 perhe)
- Korjaus vaatisi merkittävää refaktorointia (JOIN + GROUP BY)
- Nykyinen suorituskyky on riittävä

#### 4. Suomenkieliset virheviestit
**Tiedosto:** `src-tauri/src/commands/google_drive.rs:68, 87`

```rust
"Google Drive -synkronointi ei ole vielä käytössä"
```

**Selitys:** Käyttäjälle näytettävä viesti, suomeksi tarkoituksella.

---

## MAHDOLLISET TULEVAT PARANNUKSET

### Matala prioriteetti (ei kiire)

#### 1. Tietokanta-transaktiot
**Tiedosto:** `src-tauri/src/commands/results.rs:360`

`recalculate_records()` suorittaa useita UPDATE-kyselyitä ilman transaktiota. Voisi käyttää `sqlx::Transaction` atomisiin päivityksiin.

#### 2. Tietokanta-alustuksen odotus
**Tiedosto:** `src-tauri/src/lib.rs:28-38`

Tietokanta alustetaan async-spawnissa ilman odotusta. Teoriassa komennot voivat tulla ennen kuin tietokanta on valmis. Käytännössä UI latautuu hitaammin, joten tämä ei ole ongelma.

#### 3. Resurssien siivous virhetilanteissa
**Tiedosto:** `src-tauri/src/commands/photos.rs:109, 501`

Jos tiedosto kopioidaan mutta tietokantainsert epäonnistuu, orphan-tiedosto jää levylle. Voisi käyttää cleanup-logiikkaa.

---

## TYYLIKOODISÄÄNNÖT

### Käytä aina:
- `text-caption` (11px) - badget, kuvatekstit
- `text-body` (13px) - body-teksti, labelit
- `text-default` (14px) - standardi teksti
- `text-title` (16px) - sivuotsikot
- `text-heading` (20px) - hero-otsikot
- `text-stat` (24px) - tilastonumerot
- `text-hero-stat` (28px) - hero-tilastonumerot

### ÄLÄ käytä:
- `text-[11px]`, `text-[13px]` jne. - käytä semantic-luokkia
- `bg-[#141414]` - käytä CSS-muuttujia tai Tailwind-luokkia

### Poikkeukset (sallittu):
- Kuvien päällä: `bg-black/50 text-white`
- CSS-muuttujat opacityllä: `bg-[var(--accent)]/10`

---

## VAKIOT

Kaikki tärkeät numeeriset arvot on keskitetty `src/lib/constants.ts`:

```typescript
DASHBOARD.MAX_COMPETITIONS  // 5
DASHBOARD.MAX_RESULTS       // 3
DASHBOARD.MAX_ATHLETES      // 2

COMPETITION_URGENCY.IMMINENT  // 3 päivää
COMPETITION_URGENCY.SOON      // 7 päivää
COMPETITION_URGENCY.UPCOMING  // 14 päivää

WIND.LIMIT           // 2.0 m/s
WIND.AGE_THRESHOLD   // 14 vuotta

TOAST.DURATION_MS       // 4000ms
TOAST.EXIT_ANIMATION_MS // 200ms
```

---

## TARKISTUSKOMENNOT

```bash
# TypeScript-tarkistus
npx tsc --noEmit

# Rust-tarkistus
cd src-tauri && cargo check

# Clippy-lintit
cd src-tauri && cargo clippy

# Etsi kovakoodattuja fonttikokoja
grep -r "text-\[\\d+px\]" src/

# Etsi debug-lokituksia
grep -r "console.log" src/
```

---

*Päivitetty: 2025-12-21*
