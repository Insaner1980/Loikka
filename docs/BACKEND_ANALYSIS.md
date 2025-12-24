# Tauri Backend -analyysi

## 1. Frontend-Backend kommunikaatio

### Vahvuudet

| Osa-alue | Arvio |
|----------|-------|
| Invoke-kutsut | ✅ Selkeästi tyypitetty (`invoke<Type>("command_name", { args })`) |
| Parametrien nimeäminen | ✅ Yhtenäinen `camelCase` frontendissä, automaattinen muunnos Rustiin |
| Paluuarvot | ✅ Kaikki komennot palauttavat tyypitetyn datan |

### Esimerkki hyvästä kommunikaatiosta

```typescript
// Frontend (TypeScript)
const newAthlete = await invoke<Athlete>("create_athlete", { athlete: data });

// Backend (Rust)
#[tauri::command]
pub async fn create_athlete(app: AppHandle, athlete: CreateAthlete) -> Result<Athlete, String>
```

### Ongelma: Duplikoitu tyypitys

- Tyypit määritellään sekä Rust-puolella (`types.rs`) että TypeScript-puolella (`types/index.ts`)
- Manuaalinen synkronointi vaatii huolellisuutta

---

## 2. Rust-funktioiden organisointi

### Rakenne

```
src-tauri/src/
├── commands/
│   ├── mod.rs           # Re-export kaikki komennot
│   ├── athletes.rs      # Urheilijat
│   ├── competitions.rs  # Kilpailut
│   ├── goals.rs         # Tavoitteet
│   ├── photos.rs        # Kuvat
│   ├── sync.rs          # Import/Export
│   ├── google_drive.rs  # Google Drive API
│   └── results/         # Modularisoitu edelleen
│       ├── mod.rs
│       ├── crud.rs      # CRUD-operaatiot
│       ├── records.rs   # OE/KE-logiikka
│       ├── medals.rs    # Mitalit
│       └── types.rs     # Sisäiset tyypit
├── database.rs          # Pool + migraatiot
├── types.rs             # Jaetut tyypit
└── lib.rs               # Tauri app setup
```

**Arvio:** ✅ Hyvin organisoitu. Results-moduuli on refaktoroitu alimoduuleihin, mikä parantaa ylläpidettävyyttä.

---

## 3. Virheiden käsittely

### Nykyinen malli

```rust
// Kaikki virheet muunnetaan String-tyypiksi
.map_err(|e| e.to_string())?

// Esimerkki
let pool = get_pool(&app).await?;  // Palauttaa Result<_, String>
```

### Vahvuudet

- Yhtenäinen virhetyyppi (`String`) kaikissa komennoissa
- Virheviestit sisältävät kontekstin (esim. "Migration v3 failed: ...")

### Heikkoudet

- ⚠️ Ei strukturoitua virhetyyppiä (enum)
- ⚠️ Frontend ei voi erottaa virhetyyppejä (validaatio vs. tietokantavirhe)
- ⚠️ Migraatiovirheet ohitetaan hiljaisesti joissain kohdissa:
  ```rust
  .unwrap_or(false)  // Piilottaa virheet
  ```

### Parannusehdotus

```rust
#[derive(Debug, thiserror::Error, Serialize)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Not found: {0}")]
    NotFound(String),
}
```

---

## 4. Tietokantatoiminnot

### Vahvuudet

| Ominaisuus | Toteutus |
|------------|----------|
| Connection pooling | ✅ `SqlitePoolOptions::max_connections(5)` |
| Migraatiot | ✅ Automaattinen versiointi `_migrations`-taululla |
| N+1 -ongelman välttäminen | ✅ `get_all_athletes` käyttää subqueryja |
| Transaktiot | ⚠️ Ei käytetä kaikissa paikoissa |

### Migraatioiden hyvä käytäntö

```rust
// Tarkistaa onko sarake jo olemassa ennen lisäämistä
let has_gender: bool = sqlx::query_scalar(
    "SELECT COUNT(*) > 0 FROM pragma_table_info('athletes') WHERE name = 'gender'"
).fetch_one(pool).await.unwrap_or(false);

if !has_gender {
    sqlx::query("ALTER TABLE athletes ADD COLUMN gender TEXT...").execute(pool).await?;
}
```

### Ongelma: Duplikoitu tietojen haku

```rust
// athletes.rs:54-129 - get_athlete_stats_internal tekee 8 erillistä kyselyä
// Vaikka get_all_athletes käyttää yhtä kyselyä subqueryillä
```

### Ongelma: create_result on monimutkainen (280 riviä)

- Sisältää PB/SB-logiikan, vanhojen lippujen nollauksen, insertin
- Voisi jakaa pienempiin funktioihin

---

## 5. Yhteenveto

| Osa-alue | Arvio | Kommentti |
|----------|-------|-----------|
| Kommunikaatio | ✅ Hyvä | Selkeä invoke-rajapinta |
| Organisointi | ✅ Hyvä | Looginen moduulirakenne |
| Virhekäsittely | ⚠️ Kohtalainen | Toimii, mutta ei strukturoitu |
| Tietokanta | ✅ Hyvä | Migraatiot ja pooling kunnossa |
| Koodin toistuvuus | ⚠️ Kohtalainen | Row-to-struct -mappaus toistetaan |

---

## 6. Tehdyt korjaukset

### 6.1 Strukturoitu virhetyyppi ✅

Lisätty `src-tauri/src/error.rs`:
```rust
#[derive(Debug, Error)]
pub enum AppError {
    Database(String),
    NotFound(String),
    Validation(String),
    FileSystem(String),
    ImageProcessing(String),
    GoogleDrive(String),
    Migration(String),
}
```

Mahdollistaa frontendin reagoinnin virhetyypin mukaan tulevaisuudessa.

### 6.2 Row-to-struct makrot ✅

Lisätty `src-tauri/src/macros.rs`:
- `athlete_from_row!` - Urheilijan luonti rivistä
- `result_from_row!` - Tuloksen luonti rivistä
- `discipline_from_row!` - Lajin luonti rivistä
- `competition_from_row!` - Kilpailun luonti rivistä
- `goal_from_row!` - Tavoitteen luonti rivistä
- `photo_from_row!` - Kuvan luonti rivistä

Vähentää toistuvaa koodia ja parantaa ylläpidettävyyttä.

### 6.3 `get_athlete_stats_internal` optimointi ✅

Poistettu kokonaan 8 erillisen kyselyn funktio. Korvattu yhdellä subquery-pohjaisella kyselyllä:
```rust
const ATHLETE_WITH_STATS_QUERY: &str = r#"
    SELECT a.*,
        COALESCE((SELECT COUNT(DISTINCT discipline_id) FROM results WHERE athlete_id = a.id), 0) as discipline_count,
        ...
    FROM athletes a
"#;
```

Suorituskyky paranee merkittävästi (1 kysely vs. 8 kyselyä per urheilija).

### 6.4 Migraatioiden virhekäsittely ✅

Korvattu kaikki `unwrap_or(false)` kutsut asianmukaisella virhekäsittelyllä:
```rust
// Ennen
.unwrap_or(false);

// Jälkeen
.map_err(|e| format!("Migration vX failed checking column: {}", e))?;
```

Virheet eivät enää piiloudu hiljaisesti.

### 6.5 Transaktiot `create_result`:iin ✅

Lisätty eksplisiittinen transaktio `create_result`-funktioon:
```rust
// Aloita transaktio
let mut tx = pool.begin().await?;

// UPDATE operaatiot (PB/SB nollaus)
sqlx::query("UPDATE ...").execute(&mut *tx).await?;

// INSERT operaatio
sqlx::query("INSERT ...").execute(&mut *tx).await?;

// Commit - jos jokin epäonnistui, kaikki peruuntuu
tx.commit().await?;
```

Jos INSERT epäonnistuu, vanhojen PB/SB-lippujen nollaus peruuntuu automaattisesti.

---

### 6.6 Tyyppien automaattinen generointi (ts-rs) ✅

Lisätty `ts-rs`-kirjasto, joka generoi TypeScript-tyypit automaattisesti Rust-tyypeistä:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/generated/")]
pub struct Athlete { ... }
```

Generoidut tyypit löytyvät `src/types/generated/`-kansiosta. Generoi uudelleen:
```bash
cd src-tauri && cargo test export_typescript_types
```

### 6.7 Migraatioiden checkpoint (v10) ✅

Lisätty migraatio v10, joka dokumentoi konsolidointipisteen:
- `schema.sql` sisältää nyt täydellisen skeeman (kaikki sarakkeet v1-v9)
- Uudet asennukset saavat valmiin skeeman ilman erillisiä ALTER-komentoja
- Checkpoint merkitsee, että skeema on nyt yhtenäinen

---

## 7. Jatkokehitysideoita

1. **Tyyppiturvallisuus** - Korvaa `String` virhetyyppi `AppError`:lla komennoissa
