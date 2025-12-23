# Tietokanta-analyysi: Loikka

## Yleiskatsaus

| Ominaisuus | Arvo |
|------------|------|
| **Tyyppi** | SQLite |
| **Sijainti** | `%APPDATA%/com.loikka.app/loikka.db` |
| **Migraatioversio** | 9 (viimeisin) |
| **Tauluja** | 10 |
| **Indeksejä** | 11 |

---

## Taulut ja rakenne

### 1. `athletes` - Urheilijat
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| first_name | TEXT | NOT NULL | Etunimi |
| last_name | TEXT | NOT NULL | Sukunimi |
| birth_year | INTEGER | NOT NULL | Syntymävuosi |
| gender | TEXT | NOT NULL, DEFAULT 'T' | T=tytöt, P=pojat |
| club_name | TEXT | - | Seura |
| photo_path | TEXT | - | Profiilikuvan polku |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| updated_at | TEXT | NOT NULL, DEFAULT now | Trigger päivittää |

**Trigger:** `update_athlete_timestamp` - päivittää `updated_at` automaattisesti

---

### 2. `disciplines` - Lajit (esitäytetty)
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| name | TEXT | NOT NULL, UNIQUE | Lyhyt nimi (esim. "100m") |
| full_name | TEXT | NOT NULL | Pitkä nimi (esim. "100 metriä") |
| category | TEXT | NOT NULL, CHECK | sprints/middleDistance/longDistance/hurdles/jumps/throws/combined |
| unit | TEXT | NOT NULL, CHECK | time/distance |
| lower_is_better | INTEGER | NOT NULL, DEFAULT 1 | 1=aika, 0=matka |
| icon_name | TEXT | - | Lucide-ikoni |

**Seed-data:** 27 lajia (ID 1-27)

---

### 3. `results` - Tulokset
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| athlete_id | INTEGER | NOT NULL, FK → athletes | |
| discipline_id | INTEGER | NOT NULL, FK → disciplines | |
| date | TEXT | NOT NULL | ISO-päivämäärä |
| value | REAL | NOT NULL | Sekunteja TAI metrejä |
| type | TEXT | NOT NULL, CHECK | competition/training |
| competition_name | TEXT | - | Kilpailun nimi |
| competition_level | TEXT | CHECK | seura/seuraottelu/piiri/pm/alue/sm/kll/muu |
| location | TEXT | - | Paikka |
| placement | INTEGER | - | Sijoitus |
| notes | TEXT | - | Muistiinpanot |
| is_personal_best | INTEGER | NOT NULL, DEFAULT 0 | OE |
| is_season_best | INTEGER | NOT NULL, DEFAULT 0 | KE |
| is_national_record | INTEGER | NOT NULL, DEFAULT 0 | SE |
| wind | REAL | - | Tuuli m/s |
| status | TEXT | DEFAULT 'valid' | valid/nm/dns/dnf/dq |
| equipment_weight | REAL | - | Välineen paino kg (heitot) |
| hurdle_height | INTEGER | - | Aitakorkeus cm |
| hurdle_spacing | REAL | - | Aitaväli m |
| created_at | TEXT | NOT NULL, DEFAULT now | |

**FK-käyttäytyminen:**
- `athlete_id` → ON DELETE CASCADE
- `discipline_id` → ON DELETE RESTRICT

---

### 4. `competitions` - Kilpailut
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| name | TEXT | NOT NULL | |
| date | TEXT | NOT NULL | Alkupäivä |
| end_date | TEXT | - | Loppupäivä (monipäiväiset) |
| location | TEXT | - | Paikkakunta |
| address | TEXT | - | Osoite |
| level | TEXT | CHECK | Kilpailutaso |
| notes | TEXT | - | |
| reminder_enabled | INTEGER | NOT NULL, DEFAULT 0 | |
| reminder_days_before | INTEGER | - | Muistutus X päivää ennen |
| created_at | TEXT | NOT NULL, DEFAULT now | |

---

### 5. `competition_participants` - Kilpailuosallistujat
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| competition_id | INTEGER | NOT NULL, FK → competitions | |
| athlete_id | INTEGER | NOT NULL, FK → athletes | |
| disciplines_planned | TEXT | - | JSON-taulukko discipline ID:istä |

**Rajoite:** UNIQUE(competition_id, athlete_id) - yksi osallistuminen per urheilija

---

### 6. `goals` - Tavoitteet
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| athlete_id | INTEGER | NOT NULL, FK → athletes | |
| discipline_id | INTEGER | NOT NULL, FK → disciplines | |
| target_value | REAL | NOT NULL | Tavoitearvo |
| target_date | TEXT | - | Tavoitepäivä |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK | active/achieved/abandoned |
| achieved_at | TEXT | - | Saavutushetki |
| created_at | TEXT | NOT NULL, DEFAULT now | |

---

### 7. `medals` - Mitalit
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| athlete_id | INTEGER | NOT NULL, FK → athletes | |
| result_id | INTEGER | FK → results | ON DELETE SET NULL |
| type | TEXT | NOT NULL, CHECK | gold/silver/bronze |
| competition_name | TEXT | NOT NULL | |
| discipline_name | TEXT | - | |
| date | TEXT | NOT NULL | |
| created_at | TEXT | NOT NULL, DEFAULT now | |

---

### 8. `photos` - Kuvat (entity-pohjainen)
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, AUTO | |
| entity_type | TEXT | NOT NULL, CHECK | athletes/results/competitions |
| entity_id | INTEGER | NOT NULL | Kohteen ID |
| file_path | TEXT | NOT NULL | Kuvatiedoston polku |
| thumbnail_path | TEXT | - | Pikkukuvan polku |
| original_name | TEXT | NOT NULL | Alkuperäinen tiedostonimi |
| width | INTEGER | - | Leveys px |
| height | INTEGER | - | Korkeus px |
| size_bytes | INTEGER | NOT NULL, DEFAULT 0 | Tiedostokoko |
| event_name | TEXT | - | Tapahtuman nimi (vapaa teksti) |
| created_at | TEXT | NOT NULL, DEFAULT now | |

---

### 9. `sync_status` - Google Drive -tila (singleton)
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| id | INTEGER | PK, CHECK (id = 1) | Vain 1 rivi |
| last_sync_at | TEXT | - | Viimeisin synkronointi |
| google_drive_folder_id | TEXT | - | Drive-kansion ID |
| database_file_id | TEXT | - | DB-tiedoston ID Drivessa |
| state | TEXT | NOT NULL, DEFAULT 'notConfigured', CHECK | notConfigured/synced/pending/error |

---

### 10. `_migrations` - Migraatiohistoria
| Sarake | Tyyppi | Rajoitteet | Kuvaus |
|--------|--------|------------|--------|
| version | INTEGER | PK | Migraationumero |
| description | TEXT | NOT NULL | Kuvaus |
| applied_at | TEXT | NOT NULL, DEFAULT now | Ajohetki |

---

## Indeksit

| Nimi | Taulu | Sarakkeet | Tarkoitus |
|------|-------|-----------|-----------|
| idx_results_athlete | results | athlete_id | Urheilijan tulokset |
| idx_results_discipline | results | discipline_id | Lajin tulokset |
| idx_results_date | results | date | Päivämäärähaut |
| idx_results_athlete_discipline | results | athlete_id, discipline_id | Yhdistelmähaku |
| idx_results_personal_best | results | athlete_id, discipline_id, is_personal_best | OE-haku |
| idx_goals_athlete | goals | athlete_id | Urheilijan tavoitteet |
| idx_goals_status | goals | status | Aktiiviset tavoitteet |
| idx_medals_athlete | medals | athlete_id | Urheilijan mitalit |
| idx_competitions_date | competitions | date | Kalenteri |
| idx_competition_participants_competition | competition_participants | competition_id | Kilpailun osallistujat |
| idx_competition_participants_athlete | competition_participants | athlete_id | Urheilijan kilpailut |
| idx_photos_entity | photos | entity_type, entity_id | Entity-kuvat |

---

## Migraatiohistoria

| Versio | Kuvaus |
|--------|--------|
| v1 | Alkuperäinen skeema + trigger |
| v2 | Lajien seed-data (27 lajia) |
| v3 | Photos-taulun uudelleenluonti (entity-pohjainen) |
| v4 | `level`-sarake competitions-tauluun |
| v5 | `competition_level`-sarake results-tauluun |
| v6 | `wind`, `status`, `equipment_weight`, `hurdle_height`, `hurdle_spacing` results-tauluun |
| v7 | `gender`-sarake athletes-tauluun |
| v8 | `event_name`-sarake photos-tauluun |
| v9 | `is_national_record`-sarake results-tauluun |

---

## Huomioita ja suosituksia

### ✅ Hyvin toteutettu
- **Referenssi-integriteetti** - FK-rajoitteet CASCADE/RESTRICT/SET NULL oikein
- **Indeksointi** - Kattavat indeksit yleisimmille hauille
- **Migraatiojärjestelmä** - Automaattinen, versioitu
- **Singleton-pattern** - sync_status CHECK (id = 1)
- **Entity-pohjainen photos** - Joustava, laajennettava

### ⚠️ Huomioita
1. **Photos-taulu ei käytä FK:ta** - `entity_id` ei ole varsinainen foreign key, koska se viittaa eri tauluihin `entity_type`:n mukaan. Tämä on tarkoituksellista joustavuutta, mutta tarkoittaa että orpo-kuvia voi jäädä jos kohde poistetaan.

2. **Disciplines on read-only** - Lajeja ei voi lisätä UI:sta, vain seed-datasta

3. **Medal ei yhdisty competition-tauluun** - `competition_name` on vapaa teksti, ei FK. Tämä mahdollistaa mitalit kilpailuista jotka eivät ole kalenterissa.

---

## ER-kaavio (tekstimuodossa)

```
athletes ─────┬──< results >──┬───── disciplines
              │               │
              │               └──< goals
              │
              ├──< medals
              │
              └──< competition_participants >── competitions

photos (entity_type, entity_id) ──> athletes | results | competitions

sync_status (singleton, id=1)
```

---

*Generoitu: 2024-12-23*
