# Loikka - Käyttöohje

Tervetuloa Loikkaan! Tämä sovellus auttaa sinua seuraamaan lastesi yleisurheilutuloksia, ennätyksiä ja kehitystä.

---

## Sisällysluettelo

1. [Aloitus](#aloitus)
2. [Lähtöviiva (etusivu)](#lähtöviiva-etusivu)
3. [Urheilijat](#urheilijat)
4. [Tulokset](#tulokset)
5. [Kilpailut](#kilpailut)
6. [Kalenteri](#kalenteri)
7. [Tilastot](#tilastot)
8. [Tavoitteet](#tavoitteet)
9. [Kuvat](#kuvat)
10. [Asetukset ja varmuuskopiointi](#asetukset-ja-varmuuskopiointi)
11. [Pikanäppäimet](#pikanäppäimet)
12. [Sanasto](#sanasto)
13. [Ongelmatilanteet](#ongelmatilanteet)

---

## Aloitus

### Ensimmäinen urheilija

1. Avaa **Urheilijat**-sivu (sivupalkista tai paina `2`)
2. Klikkaa **"Lisää urheilija"** -nappia (tai paina `Ctrl+U`)
3. Täytä tiedot:
   - **Etunimi** ja **Sukunimi**
   - **Syntymävuosi** (tästä lasketaan ikäluokka automaattisesti)
   - **Seura** (valinnainen)
4. Klikkaa **Tallenna**

### Ensimmäinen tulos

1. Avaa **Tulokset**-sivu (sivupalkista tai paina `3`)
2. Klikkaa **"Lisää tulos"** (tai `Ctrl+U`)
3. Valitse:
   - **Urheilija** (pudotusvalikosta)
   - **Laji** (esim. 60m, pituushyppy, kuulantyöntö)
   - **Tulos** (aika tai matka)
   - **Päivämäärä**
   - **Kilpailu vai harjoitus**
4. Klikkaa **Tallenna**

---

## Lähtöviiva (etusivu)

Lähtöviiva on sovelluksen etusivu. Siinä näet yhdellä silmäyksellä:

### Ylärivi - Tilastokortit

- **Urheilijat** - Kuinka monta urheilijaa on kirjattu
- **Tulokset** - Tulosten kokonaismäärä
- **Ennätyksiä** - Tänä vuonna rikotut ennätykset
- **Mitalit** - Mitaleiden kokonaismäärä

### Tulevat kilpailut

Lista lähestyvistä kilpailuista päivämäärän mukaan järjestettynä.

### Viimeisimmät tulokset

Kolme viimeksi lisättyä tulosta. OE-, KE- ja SE-merkinnät näkyvät, jos tulos on ennätys.

### Urheilijat

Urheilijakortit, joista näet mitalit ja ennätysten määrän.

---

## Urheilijat

### Urheilijalista

Urheilijat-sivulla näet kaikki urheilijat kortteina. Jokaisessa kortissa näkyy:
- Profiilikuva (tai nimikirjaimet)
- Nimi ja ikäluokka (esim. T12 = tyttö 12v)
- Seura
- Mitalit (kulta, hopea, pronssi)
- Ennätysten määrä (OE, KE, SE)

### Urheilijan lisääminen

1. Klikkaa **"Lisää urheilija"**
2. Täytä etunimi, sukunimi ja syntymävuosi
3. Seura (valinnainen)
4. Klikkaa **Tallenna**

### Urheilijan muokkaaminen

Avaa urheilijan profiili ja klikkaa **"Muokkaa"** ylhäällä.

### Urheilijan poistaminen

Avaa urheilijan profiili ja klikkaa roskakori-ikonia ylhäällä.

### Urheilijan profiilisivu

Kun klikkaat urheilijaa, avautuu tarkempi näkymä:

**Välilehdet:**
- **Yleiskatsaus** - Ennätykset lajeittain, tuoreimmat tulokset
- **Tulokset** - Kaikki urheilijan tulokset
- **Kilpailut** - Kilpailut joihin osallistunut
- **Tavoitteet** - Urheilijan tavoitteet
- **Mitalit** - Voitetut mitalit
- **Kuvat** - Urheilijan kuvagalleria

### Ikäluokat

Sovellus laskee ikäluokan automaattisesti syntymävuoden perusteella:

| Merkintä | Selitys |
|----------|---------|
| T7, T9, T11... | Tyttö, ikäluokat 7, 9, 11, 13, 15, 17 |
| N | Nainen (aikuinen) |

---

## Tulokset

### Tuloslistaus

Tulokset-sivulla näet kaikki tulokset taulukkona. Voit:
- **Suodattaa** urheilijan, lajin tai vuoden mukaan
- **Järjestää** päivämäärän tai tuloksen mukaan
- Nähdä ennätysmerkinnät (OE, KE, SE)

### Tuloksen lisääminen

1. Klikkaa **"Lisää tulos"**
2. Täytä:
   - **Urheilija**
   - **Laji**
   - **Tulos** (katso muoto alla)
   - **Päivämäärä**
   - **Tyyppi** (kilpailu/harjoitus)
   - **Kilpailun taso** (Seurakisat, PM, SM jne.) - valinnainen

### Tulosmuodot

| Lajityyppi | Esimerkki | Miten kirjoitetaan |
|------------|-----------|-------------------|
| Pikajuoksut (alle 200m) | 8.54 s | `8.54` (sekunnit ja sadasosat) |
| Pikajuoksut (200m+) | 25.34 s | `0:25.34` (minuutit, sekunnit, sadasosat) |
| Keskimatkat | 2:34.56 | `2:34.56` |
| Kestävyys | 11:23.45 | `11:23.45` |
| Maastojuoksu | 4:32.10 | `4:32.10` |
| Viestit | 52.34 s | `0:52.34` (minuutit, sekunnit, sadasosat) |
| Kävely | 3:45.20 | `3:45.20` |
| Hypyt | 4.25 m | `4.25` (metrit ja senttimetrit) |
| Heitot | 28.50 m | `28.50` (metrit ja senttimetrit) |
| Cooper | 2025 m | `2025` (kokonaiset metrit) |
| Moniottelu | 2500 p | `2500` (pisteet, lasketaan osalajeista) |

### Lisätiedot lajeittain

Joillakin lajeilla on lisäkenttiä:

**Tuuli** (pikajuoksut, pituus, kolmiloikka, aitajuoksut)
- Kirjoita tuulilukema, esim. `+1.8` tai `-0.5`
- Jos tuuli yli +2.0 m/s, tulos merkitään tuuliavusteiseksi (14v ja vanhemmat)

**Välineen paino** (heitot)
- Valitse pudotusvalikosta (esim. kuula 2 kg, 3 kg, 4 kg)
- Eri painoille lasketaan omat ennätykset

**Aitakorkeus** (aitajuoksut)
- Valitse pudotusvalikosta (60 cm, 68 cm, 76 cm jne.)

### Tuloksen status

Joskus suoritus ei onnistu. Valitse status:

| Status | Milloin käytetään |
|--------|-------------------|
| Hyväksytty | Normaali hyväksytty tulos |
| NM | Ei tulosta (esim. kaikki hypyt epäonnistuneet) |
| DNS | Ei startannut (esim. sairastui) |
| DNF | Keskeytti kesken suorituksen |
| DQ | Hylätty sääntörikkomuksesta |

### Ennätykset

Sovellus pitää kirjaa ennätyksistä:

- **OE (Oma ennätys)** = Paras tulos koskaan kyseisessä lajissa
- **KE (Kauden ennätys)** = Paras tulos tänä vuonna
- **SE (Suomen ennätys)** = Suomen ennätys

**Huom:** Tuuliavusteiset tulokset (tuuli > +2.0 m/s) eivät voi olla virallisia ennätyksiä 14-vuotiailla ja vanhemmilla.

---

## Kilpailut

### Kilpailukalenteri

Kilpailut-sivulla näet tulevat ja menneet kilpailut. Kilpailukortissa näkyy:
- Kilpailun nimi
- Päivämäärä ja paikka
- Osallistuvat urheilijat
- Kilpailun taso (Seurakisat, PM, SM jne.)

### Kilpailun lisääminen

1. Klikkaa **"Lisää kilpailu"**
2. Täytä:
   - **Kilpailun nimi** (esim. "Piirinmestaruudet")
   - **Päivämäärä**
   - **Paikka** (valinnainen)
   - **Taso** (Seurakisat, Koululaiskisat, PM, SM jne.)
   - **Lajit** - Valitse mitkä lajit kilpailussa on
   - **Osallistujat** - Valitse ketkä urheilijat osallistuvat
3. Tallenna

### Kilpailun taso

- Seurakisat
- Koululaiskisat
- Seuran sisäiset kisat
- Seuraottelut
- Piirikisat
- Piirinmestaruuskilpailut (PM)
- Hallikisat
- Aluekisat
- Pohjola Seuracup
- SM-kilpailut

---

## Kalenteri

Kalenteri-sivu näyttää kuukausinäkymän kilpailuista.

### Käyttö

- **Vaihda kuukautta:** Klikkaa nuolia otsikon vieressä (tai käytä `←` ja `→` nuolinäppäimiä)
- **Mene tähän päivään:** Paina `T`-näppäintä
- **Katso kilpailun tiedot:** Klikkaa päivää jossa on kilpailumerkintä

Päivät joissa on kilpailu on merkitty pisteellä.

---

## Tilastot

Tilastot-sivulla näet kaavioita urheilijoiden kehityksestä.

### Saatavilla olevat näkymät

- **Tuloskehitys** - Miten tulokset ovat kehittyneet ajan myötä
- **Lajivertailu** - Tulokset eri lajeissa
- **Vuosivertailu** - Eri vuosien tulosten vertailu

### Suodattimet

Voit valita:
- **Urheilijan** - Kenen tilastoja katsot
- **Lajin** - Minkä lajin tuloksia
- **Aikavälin** - Miltä ajalta

---

## Tavoitteet

Tavoitteet-sivulla voit asettaa ja seurata tavoitteita.

### Tavoitteen lisääminen

1. Klikkaa **"Lisää tavoite"**
2. Täytä:
   - **Urheilija**
   - **Laji**
   - **Tavoitetulos** (esim. 60m alle 9.00)
   - **Tavoitepäivä** (valinnainen)
3. Tallenna

### Tavoitteen seuranta

Tavoitekortti näyttää:
- Nykyisen parhaan tuloksen
- Tavoitetuloksen
- Edistymisen prosentteina
- Jäljellä olevan matkan tavoitteeseen

**Tilat:**
- **Kesken** - Tavoitetta ei ole vielä saavutettu
- **Lähellä!** - Alle 10% puuttuu
- **Saavutettu** - Tavoite saavutettu

---

## Kuvat

Kuvat-sivulla on kuvagalleria.

### Kuvien lisääminen

Kuvia voi lisätä kolmella tavalla:

**1. Urheilijan kuvat**
1. Avaa urheilijan profiili
2. Mene **Kuvat**-välilehdelle
3. Klikkaa **"Lisää kuva"**
4. Valitse kuva(t) tietokoneelta

**2. Tuloksen kuvat**
1. Avaa tulos
2. Klikkaa **"Lisää kuva"**
3. Valitse kuva

**3. Yleinen galleria**
1. Avaa **Kuvat**-sivu
2. Klikkaa **"Lisää kuva"**
3. Valitse kuva(t)

### Kuvien katselu

- Klikkaa kuvaa avataksesi sen isompana
- Selaa kuvia nuolinäppäimillä
- Sulje painamalla `Esc`, klikkaamalla × tai kuvan ulkopuolelle

---

## Asetukset ja varmuuskopiointi

Asetukset-sivulla voit viedä ja tuoda tietoja.

### Vie tiedot (tallenna varmuuskopio)

1. Avaa **Asetukset**
2. Klikkaa **"Vie tiedot"**
3. Valitse tallennuspaikka (esim. Työpöytä)
4. Anna tiedostolle nimi
5. Klikkaa **Tallenna**

Tiedosto tallentuu `.json`-muodossa. Se sisältää urheilijat, tulokset, kilpailut ja tavoitteet.

### Tuo tiedot (palauta varmuuskopiosta)

1. Avaa **Asetukset**
2. Klikkaa **"Tuo tiedot"**
3. Valitse aiemmin tallennettu `.json`-tiedosto
4. Klikkaa **Avaa**

**Huom!** Tuonti korvaa nykyiset tiedot.

### Missä tiedot sijaitsevat?

Tiedot tallennetaan automaattisesti:

```
C:\Users\[käyttäjänimesi]\AppData\Roaming\com.loikka.app\
```

Sinne pääset:
1. Paina `Windows + R`
2. Kirjoita `%APPDATA%\com.loikka.app`
3. Paina Enter

Kansiossa on:
- `loikka.db` - Tietokanta
- `photos/` - Kuvat
- `profile_photos/` - Profiilikuvat

---

## Pikanäppäimet

### Yleiset

| Näppäin | Toiminto |
|---------|----------|
| `Ctrl + U` | Lisää uusi (urheilija, tulos, kilpailu - riippuu sivusta) |
| `Esc` | Sulje dialogi / Poistu valintatilasta / Sulje kuva |
| Klikkaa tyhjää | Poistu valintatilasta |

### Navigointi

| Näppäin | Sivu |
|---------|------|
| `1` | Lähtöviiva |
| `2` | Urheilijat |
| `3` | Tulokset |
| `4` | Kalenteri |
| `5` | Tilastot |
| `6` | Tavoitteet |
| `7` | Kuvat |
| `8` | Asetukset |

### Kalenteri

| Näppäin | Toiminto |
|---------|----------|
| `←` | Edellinen kuukausi |
| `→` | Seuraava kuukausi |
| `T` | Mene tähän päivään |

### Kuvien katselu

| Näppäin | Toiminto |
|---------|----------|
| `←` | Edellinen kuva |
| `→` | Seuraava kuva |
| `Esc` | Sulje |

---

## Sanasto

| Lyhenne | Merkitys |
|---------|----------|
| **OE** | Oma ennätys (Personal Best) - paras tulos koskaan |
| **KE** | Kauden ennätys (Season Best) - paras tulos tänä vuonna |
| **SE** | Suomen ennätys (National Record) |
| **DNS** | Did Not Start - ei startannut |
| **DNF** | Did Not Finish - keskeytti |
| **DQ** | Disqualified - hylätty |
| **NM** | No Mark - ei hyväksyttyä tulosta |
| **w** | Wind-assisted - tuuliavusteinen (tuuli > +2.0 m/s) |

### Lajikategoriat

| Kategoria | Lajit |
|-----------|-------|
| Pikajuoksut | 40m, 60m, 100m, 150m, 200m, 300m, 400m |
| Keskimatkat | 600m, 800m, 1000m, 1500m, 2000m |
| Kestävyys | 3000m, 5000m, 10000m |
| Aitajuoksut | 60m aj, 80m aj, 100m aj, 200m aj, 300m aj, 400m aj |
| Hypyt | Pituus, kolmiloikka, korkeus, seiväs |
| Heitot | Kuula, kiekko, keihäs, moukari, pallo |
| Moniottelu | 3-ottelu, 4-ottelu, 5-ottelu, 7-ottelu |
| Kävely | 600m, 800m, 1000m, 2000m, 3000m, 5000m, 10km kävely |
| Maastojuoksu | 500m, 1km, 2km, 4km, 10km maasto |
| Viestit | 8x40m sukkulaviesti, 4x50m, 4x100m, 4x200m, 4x300m, 4x400m, 4x800m viesti |
| Muut | Cooper-testi (12 min juoksu, tulos metreissä) |

---

## Ongelmatilanteet

### Sovellus ei käynnisty

1. Kokeile käynnistää tietokone uudelleen
2. Tarkista että sovellus on asennettu oikein

### Tiedot eivät tallennu

- Varmista että levytilaa on riittävästi
- Kokeile käynnistää sovellus uudelleen

### Kuvat eivät näy

- Tarkista että kuvatiedostot ovat paikoillaan (`%APPDATA%\com.loikka.app\photos\`)
- Kokeile käynnistää sovellus uudelleen

### Unohdin varmuuskopioida

Jos tietokone hajoaa etkä ole varmuuskopioinut, tiedot ovat valitettavasti menetetty. Muista varmuuskopioida säännöllisesti!

**Suositus:** Varmuuskopioi vähintään kerran kuukaudessa tai aina isojen kilpailujen jälkeen.

---

*Tämä ohje päivitetty: 30.12.2025*

*Loikka - Seuraa kehitystä, juhli ennätyksiä!*
