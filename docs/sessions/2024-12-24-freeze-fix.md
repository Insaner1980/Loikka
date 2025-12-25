# Session 2024-12-24: App Freeze Fix

## Ongelma

Sovellus jähmettyi navigoitaessa sivujen välillä. Muutaman klikkauksen jälkeen UI lakkasi vastaamasta.

## Juurisyy

**React useEffect infinite loop** - Zustand store -funktiot (kuten `fetchAthletes`, `fetchResults` jne.) eivät ole stabiileja referenssejä. Kun ne lisätään useEffect-riippuvuuksiin, useEffect suoritetaan uudelleen joka renderöinnillä, mikä aiheuttaa uuden fetchin, mikä päivittää staten, mikä triggeröi uuden renderöinnin... ikuinen silmukka.

### Esimerkki ongelmasta:

```tsx
// VÄÄRIN - aiheuttaa infinite loopin
useEffect(() => {
  fetchAthletes();
}, [fetchAthletes]); // fetchAthletes ei ole stabiili!

// OIKEIN - suoritetaan vain mountissa
useEffect(() => {
  fetchAthletes();
}, []); // tyhjä dependency array
```

## Korjatut tiedostot

### Sivut (pages/)
| Tiedosto | Vanha | Uusi |
|----------|-------|------|
| `Dashboard.tsx` | `[fetchResults, fetchAthletes, ...]` | `[]` |
| `Athletes.tsx` | `[fetchAthletes]` | `[]` |
| `Results.tsx` | `[fetchResults, fetchAthletes]` | `[]` |
| `Calendar.tsx` | `[fetchCompetitions]` | `[]` |
| `Goals.tsx` | `[fetchGoals, fetchAthletes, ...]` | `[]` |
| `Statistics.tsx` | `[fetchResults, fetchAthletes]` | `[]` |
| `Photos.tsx` | `[fetchPhotos]` | `[]` |
| `AthleteDetail.tsx` | `[athletes.length, fetchAthletes]` | `[]` |

### Komponentit (components/)
| Tiedosto | Vanha | Uusi |
|----------|-------|------|
| `GoalForm.tsx` | `[athletes.length, fetchAthletes]` | `[]` |
| `CompetitionForm.tsx` | `[athletes.length, fetchAthletes, ...]` | `[]` |
| `ResultForm.tsx` | `[athletes.length, fetchAthletes, ...]` | `[]` |
| `ResultEditDialog.tsx` | `[competitions.length, fetchCompetitions]` | `[]` |
| `ResultCard.tsx` | `[fetchPhotoCount, result.id]` | `[result.id]` |
| `PhotoGallery.tsx` | `[fetchEntityPhotos, entityType, entityId]` | `[entityType, entityId]` |
| `GoogleDriveSettings.tsx` | `[checkStatus]` ja `[..., fetchBackups]` | `[]` |
| `SyncOptionsDialog.tsx` | `[..., fetchCloudPhotos, fetchLocalPhotos]` | `[open, mode]` |

### Hookit (hooks/)
| Tiedosto | Vanha | Uusi |
|----------|-------|------|
| `useAthleteData.ts` | `[fetchAll]` | `[athleteId]` |

## Poistetut ominaisuudet

### useReminders hook
Poistettu kokonaan käyttäjän pyynnöstä:
- `src/hooks/useReminders.ts` - poistettu
- `src/hooks/index.ts` - poistettu export
- `src/components/layout/Layout.tsx` - poistettu hook-kutsu

Muistutustoiminnallisuus ei ollut käytössä.

## Muut muutokset tässä sessiossa

### Focus-tyylit (aiemmin)
Yhtenäistetty sininen focus-reunus kaikkiin lomakekenttiin käyttämällä `input-focus` CSS-luokkaa.

### Hover-checkbox kuvagalleriaan (aiemmin)
Lisätty Google Photos -tyylinen hover-checkbox kuvien valintaan:
- Checkbox näkyy hoverin yhteydessä
- Ctrl+click ja Shift+click -tuki
- Esc poistuu valintatilasta

## Jäljellä olevat ongelmat

1. **Jähmettyminen jatkuu osittain** - Käyttäjä raportoi, että sovellus jähmettyy vielä jonkin verran. Voi johtua:
   - Tietokoneen rasituksesta (käyttäjä tekee muutakin)
   - Jostakin muusta infinite loop -lähteestä
   - Zustand store -ongelmasta

2. **DatePicker kalenteri** - Käyttäjä mainitsi, että kuukausi ei näkynyt kunnolla / meni lomakkeen ulkopuolelle. Tämä on CSS/positioning-ongelma, ei liity jähmettymiseen.

## Seuraavat askeleet

1. Käynnistä tietokone uudelleen
2. Testaa jähmettyykö vielä
3. Jos jähmettyy, tarkista:
   - React DevTools Profiler - mikä komponentti renderöityy jatkuvasti
   - Zustand storet - onko jokin store epästabiili
   - Muut useEffect-hookit joissa voi olla ongelmia

## Debuggausvinkkejä

```bash
# Etsi kaikki useEffect-hookit joissa on fetch-funktioita riippuvuuksissa
grep -r "}, \[.*fetch" src/

# Etsi kaikki useEffect-hookit
grep -rn "useEffect" src/ | grep -v node_modules
```

## Tekninen tausta

Zustand store -funktiot luodaan uudelleen joka kerta kun `create()` kutsutaan tai kun store päivittyy. Tämä tarkoittaa, että:

```tsx
const { fetchData } = useMyStore();
// fetchData on uusi funktio joka renderöinnillä!
```

Ratkaisu on joko:
1. Käyttää tyhjää dependency arrayta `[]` kun haetaan dataa mountissa
2. Käyttää `useRef` tallentamaan funktio
3. Käyttää Zustandin `useShallow` selectoria
