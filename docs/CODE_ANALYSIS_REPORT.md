# Loikka - Koodikannan Analyysiraportti

**Päivämäärä:** 2025-12-26
**Analysoija:** Claude Code
**Versio:** 1.0

---

## Yhteenveto

Loikka-projektin koodikanta on analysoitu kattavasti. Analyysi kattoi:
- TypeScript-tyyppien yhteneväisyys
- Tietokantarakenne ja Rust-backend
- Zustand-tilanhallinta
- React-komponenttirakenne
- CSS ja tyylitys
- Hookit ja apufunktiot
- Kuollut koodi ja käyttämättömät exportit
- Tauri-komentojen yhteensopivuus

**Kokonaistulos:** Koodikanta on hyvin rakennettu ja turvallinen. Löydetyt ongelmat ovat pääosin keskitason tai alhaisen vakavuuden ongelmia, jotka voidaan korjata ilman merkittävää refaktorointia.

---

## 1. Kriittiset Ongelmat (HIGH)

### 1.1 Jakamisella nollaan -riski (useGoalStore)

**Tiedosto:** `src/stores/useGoalStore.ts` (rivit 159-169)

```typescript
const estimatedStart = goal.targetValue * 1.2;
const totalImprovement = estimatedStart - goal.targetValue;
// Jos targetValue === 0, totalImprovement === 0 → Infinity/NaN
const achievedImprovement = estimatedStart - currentBest;
return (achievedImprovement / totalImprovement) * 100;
```

**Ongelma:** Jos `goal.targetValue` on 0, `totalImprovement` on 0, mikä aiheuttaa jakamisen nollalla.

**Korjaus:** Lisää tarkistus:
```typescript
if (goal.targetValue === 0) return 0;
```

---

### 1.2 Kuvatiedostojen poistossa hiljainen virhe (photos.rs)

**Tiedosto:** `src-tauri/src/commands/photos.rs` (rivit 257-265, 479-486)

```rust
if let Err(e) = fs::remove_file(&file_path) {
    eprintln!("Failed to delete photo file: {}", e);
}
// Tietokantarivi poistetaan vaikka tiedoston poisto epäonnistui
```

**Ongelma:** Tiedoston poisto epäonnistuu hiljaisesti, mutta tietokantarivi poistetaan. Tämä jättää orpoja tiedostoja levylle.

**Korjaus:** Palauta virhe käyttäjälle tai suorita poisto transaktiossa.

---

### 1.3 Mitaleiden vienti puutteellinen (sync.rs)

**Tiedosto:** `src-tauri/src/commands/sync.rs` (rivi 104)

```sql
SELECT id, athlete_id, result_id, type, competition_name, discipline_name, date, created_at FROM medals
```

**Ongelma:** Puuttuvat kentät: `location`, `competition_id`, `discipline_id`. Tietojen vienti menettää dataa.

**Korjaus:** Päivitä kysely sisältämään kaikki kentät.

---

### 1.4 Goals.tsx liian suuri (452 riviä)

**Tiedosto:** `src/pages/Goals.tsx`

**Ongelma:** Komponentti on liian monimutkainen (10 useState-kutsua, monimutkainen suodatuslogiikka, usea modaali).

**Korjaus:** Pilko pienemiksi komponenteiksi:
- `GoalFilterPanel`
- `ActiveGoalsList`
- `AchievedGoalsList`

---

## 2. Keskitason Ongelmat (MEDIUM)

### 2.1 Photo-tyypin epäyhteneväisyys

**Tiedostot:**
- `src/stores/usePhotoStore.ts` (rivit 24-35): `thumbnailPath: string | null`
- `src/types/index.ts` (rivit 157-169): `thumbnailPath?: string`

**Ongelma:** Tyypit poikkeavat toisistaan (null vs undefined).

---

### 2.2 EntityType vs PhotoEntityType nimeämisepäselvyys

**Tiedostot:**
- `src/stores/usePhotoStore.ts` (rivi 37): `EntityType`
- `src/types/index.ts` (rivi 53): `PhotoEntityType`

**Ongelma:** Sama konsepti, kaksi eri nimeä.

---

### 2.3 ResultWithDiscipline määritelty kahdessa paikassa

**Tiedostot:**
- `src/types/index.ts` (rivit 236-238)
- `src/components/athletes/tabs/types.ts` (rivit 3-5)

**Ongelma:** Sama tyyppi kahdessa tiedostossa.

---

### 2.4 Aikavyöhykeongelma getDaysUntil-funktiossa

**Tiedosto:** `src/lib/formatters.ts` (rivit 169-176)

**Ongelma:** ISO-päivämäärät ovat UTC:ssä, mutta funktio käsittelee ne paikallisessa aikavyöhykkeessä.

**Korjaus:** Käytä date-fns `differenceInDays()`.

---

### 2.5 Kovakoodatut värit

| Tiedosto | Rivi | Ongelma |
|----------|------|---------|
| `MedalsTab.tsx` | 127 | `text-black/70` |
| `ResultCard.tsx` | 227 | `text-black/70` |
| `Dashboard.tsx` | 303 | `text-black/70` |
| `TitleBar.tsx` | 63 | `hover:bg-red-500` |
| `GoalCelebrationModal.tsx` | 45 | `bg-black/70` |

**Korjaus:** Korvaa CSS-muuttujilla.

---

### 2.6 Duplikaatti-virheenkäsittelylogiikka ResultFormissa

**Tiedosto:** `src/components/results/ResultForm.tsx` (rivit 62-79)

**Ongelma:** Kolme erillistä useEffect-hookia virheiden tyhjentämiseen.

---

### 2.7 Useiden document-tasoisten kuuntelijoiden kasautuminen

**Tiedostot:**
- `useKeyboardShortcuts.ts` (4 kuuntelijaa)
- `useAutocomplete.ts` (1 kuuntelija)
- `useDropdownPosition.ts` (2 kuuntelijaa)

**Ongelma:** Vähintään 7 erillistä keydown-kuuntelijaa.

---

### 2.8 Puuttuva ErrorBoundary

**Tiedosto:** `src/App.tsx`

**Ongelma:** Ei virheen rajausta – yhden komponentin virhe kaataa koko sovelluksen.

---

### 2.9 Päivämäärämuotoilun duplikaatio

**Tiedostot:**
- `src/lib/formatters.ts:39` – `formatDate()`
- `src/lib/googleDrive.ts:88` – `formatBackupDate()`
- `src/components/athletes/tabs/ProgressTab.tsx:139` – inline
- `src/components/athletes/tabs/ProgressTab.tsx:274` – inline

---

### 2.10 Store loading-tilan epäjohdonmukaisuus

**usePhotoStore:** Ei estä samanaikaisia fetch-kutsuja (toisin kuin muut storet).

---

## 3. Alhaisen Vakavuuden Ongelmat (LOW)

### 3.1 Käyttämättömät exportit (disciplines.ts)

- `getDisciplinesForAgeCategory` (rivi 388) – ei koskaan importoitu
- `isDisciplineAvailableForAge` (rivi 417) – ei koskaan importoitu

### 3.2 Vanhentunut useTheme-hook

**Tiedosto:** `src/hooks/useTheme.ts`

Tyhjä hook, joka palauttaa aina dark-teeman. Pidetty "taaksepäin yhteensopivuuden vuoksi" mutta ei enää tarvita.

### 3.3 Kommentoitu MCP Bridge -koodi

**Tiedosto:** `src-tauri/src/lib.rs` (rivit 24-28)

### 3.4 PhotoViewer ja PhotoGallery exportattu mutta ei käytetty

**Tiedosto:** `src/components/shared/index.ts`

### 3.5 Reunaehtojen puuttuminen formatterissa

- `formatTime()` – ei tarkista negatiivisia arvoja
- `formatDistance()` – ei tarkista negatiivisia arvoja
- `getDaysUntil()` – ei käsittele virheellisiä päivämääriä

---

## 4. Positiiviset Löydökset

### 4.1 Turvallisuus

- **Ei SQL-injektio-haavoittuvuuksia** – Kaikki kyselyt parametrisoitu
- **Kaikki Tauri-komennot käytössä** – 54/54 komentoa käytetään frontendissä
- **Oikeat oikeudet** – capabilities/default.json on asianmukainen

### 4.2 Tietokanta

- **Schema-Rust-tyyppivastaavuus** – 8/9 taulua täydellinen vastaavuus
- **Hyvät indeksit** – Kattava indeksointi suorituskykyyn
- **Transaktiot oikein** – results/crud.rs käyttää transaktioita

### 4.3 Koodi

- **Ei `any`-tyyppejä** – TypeScript-tyypit kunnossa
- **Yhtenäinen Zustand-malli** – Tilanhallinta johdonmukaista
- **Hyvä typografia** – 7 typografialuokkaa johdonmukaisesti käytössä

---

## 5. Korjausten Prioriteettijärjestys

### Kriittinen (Korjaa heti)
1. Goals.tsx pilkkominen (452 → ~150 riviä/komponentti)
2. getDaysUntil aikavyöhykekorjaus
3. Division by zero -riski useGoalStoressa

### Korkea (Korjaa pian)
1. Photos.rs hiljaisen virheen korjaus
2. Mitaleiden viennin korjaus sync.rs:ssä
3. ErrorBoundary App.tsx:ään
4. Race condition useAthleteDatassa

### Keskitaso (Korjaa seuraavaksi)
1. Photo-tyyppien yhtenäistäminen
2. EntityType/PhotoEntityType yhdistäminen
3. ResultWithDiscipline duplikaatin poisto
4. Kovakoodattujen värien korvaaminen
5. Päivämääräfunktioiden konsolidointi

### Alhainen (Korjaa kun mahdollista)
1. Käyttämättömien exporttien poisto
2. useTheme-hookin poisto
3. Kommentoidun koodin siivous
4. Formattereiden edge case -tarkistukset

---

## 6. Tilastot

| Kategoria | Määrä |
|-----------|-------|
| Kriittiset ongelmat | 4 |
| Keskitason ongelmat | 10 |
| Alhaisen vakavuuden ongelmat | 5 |
| Analysoidut TypeScript-tiedostot | ~80 |
| Analysoidut Rust-tiedostot | ~18 |
| Koodirivejä analysoitu | ~15,000+ |

---

## 7. Suositellut Seuraavat Toimenpiteet

1. **Luo GitHub Issues** – Jokaisesta kriittisestä ja korkean prioriteetin ongelmasta
2. **Lisää ESLint-säännöt** – Estä kovakoodatut värit jatkossa
3. **Lisää yksikkötestit** – Erityisesti formattereille reunatapauksissa
4. **Harkitse linteriä** – `@typescript-eslint/strict` auttaa löytämään tyyppiongelmat

---

*Raportti generoitu automaattisesti Claude Coden koodikanta-analyysillä.*
