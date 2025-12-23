# Loikka - Käyttöohje

Tämä ohje kertoo miten käytät Loikka-sovelluksen varmuuskopiointi- ja tiedonsiirto-ominaisuuksia.

---

## Tietojen vienti ja tuonti (JSON)

### Vie tiedot (tallenna varmuuskopio tietokoneelle)

1. Avaa **Asetukset** (valikosta vasemmalta)
2. Klikkaa **"Vie tiedot"**
3. Valitse minne haluat tallentaa tiedoston (esim. Ladatut-kansio tai Työpöytä)
4. Anna tiedostolle nimi tai käytä oletusta
5. Klikkaa **Tallenna**

Tiedosto tallennetaan valitsemaasi paikkaan `.json`-muodossa. Tämä tiedosto sisältää kaikki urheilijat, tulokset, kilpailut ja tavoitteet.

### Tuo tiedot (palauta varmuuskopiosta)

1. Avaa **Asetukset**
2. Klikkaa **"Tuo tiedot"**
3. Etsi ja valitse aiemmin tallentamasi `.json`-tiedosto
4. Klikkaa **Avaa**

**Huom!** Tuonti korvaa nykyiset tiedot. Varmista että sinulla on varmuuskopio nykyisistä tiedoista ennen tuontia.

---

## Google Drive -varmuuskopiointi

Google Drive -ominaisuudella voit tallentaa tiedot pilveen ja palauttaa ne toisella tietokoneella tai jos tietokoneesi hajoaa.

### Yhdistä Google Drive

1. Avaa **Asetukset**
2. Klikkaa **"Yhdistä Google Drive"**
3. Selain avautuu - kirjaudu Google-tililläsi
4. Anna sovellukselle lupa käyttää Google Driveasi
5. Kun näet selaimessa viestin **"Kirjautuminen onnistui!"**, voit sulkea selaimen

Yhdistäminen tapahtuu automaattisesti taustalla. Kun onnistuu, näet Google-tilisi sähköpostiosoitteen asetuksissa.

### Tallenna tiedot Driveen (upload)

1. Avaa **Asetukset**
2. Klikkaa **"Tallenna Driveen"** tai vastaavaa nappia
3. Valitse mitä haluat tallentaa:
   - Tietokanta (urheilijat, tulokset, kilpailut)
   - Profiilikuvat
   - Tuloskuvat
4. Klikkaa **Tallenna**

Tiedot tallentuvat Google Driveen kansioon nimeltä **"Loikka"**.

### Palauta tiedot Drivestä (download)

1. Avaa **Asetukset**
2. Klikkaa **"Palauta Drivestä"** tai vastaavaa nappia
3. Valitse varmuuskopio jonka haluat palauttaa (uusin on ylimpänä)
4. Valitse mitä haluat palauttaa
5. Klikkaa **Palauta**

**Huom!** Palautus korvaa nykyiset tiedot. Nykyisestä tietokannasta tehdään automaattisesti varmuuskopio ennen palautusta.

---

## Missä tiedot sijaitsevat?

Sovelluksen tiedot tallennetaan automaattisesti tietokoneellesi. Sinun ei yleensä tarvitse koskea näihin tiedostoihin, mutta jos haluat tietää:

**Windowsissa:**
```
C:\Users\[käyttäjänimesi]\AppData\Roaming\com.loikka.app\
```

Tähän kansioon pääset näin:
1. Paina `Windows + R` (avaa Suorita-ikkuna)
2. Kirjoita `%APPDATA%\com.loikka.app`
3. Paina Enter

Kansiossa on:
- `loikka.db` - Tietokanta (kaikki tiedot)
- `photos/` - Tuloskuvat
- `profile_photos/` - Urheilijoiden profiilikuvat

---

## Usein kysytyt kysymykset

### Mitä eroa on JSON-viennillä ja Google Drivella?

| Ominaisuus | JSON-vienti | Google Drive |
|------------|-------------|--------------|
| Tallennuspaikka | Oma tietokone | Pilvi (Google) |
| Kuvat mukana | Ei | Kyllä (valittavissa) |
| Vaatii internetin | Ei | Kyllä |
| Vaatii Google-tilin | Ei | Kyllä |
| Helppo siirtää toiselle koneelle | Tiedosto pitää kopioida itse | Kirjaudu samalla tilillä |

### Kuinka usein kannattaa varmuuskopioida?

Suosittelemme varmuuskopioimaan:
- Aina kun lisäät paljon uusia tuloksia
- Ennen isoja kilpailuja
- Vähintään kerran kuukaudessa

### Mitä teen jos unohdan varmuuskopioida ja tietokone hajoaa?

Jos et ole varmuuskopioinut Google Driveen tai tallentanut JSON-tiedostoa muualle, tiedot ovat valitettavasti menetetty. Siksi säännöllinen varmuuskopiointi on tärkeää!

---

## Ongelmatilanteet

### "Yhdistäminen epäonnistui" (Google Drive)

- Tarkista internet-yhteys
- Kokeile yhdistää uudelleen
- Varmista että selain avautuu ja kirjaudut oikealle Google-tilille

### "Tiedostoa ei voi avata" (JSON-tuonti)

- Varmista että tiedosto on `.json`-muodossa
- Varmista että tiedosto on Loikka-sovelluksesta viety (ei mikä tahansa JSON)

### Kuvat eivät näy palautuksen jälkeen

- Varmista että valitsit "Kuvat" palautusasetuksista
- Kokeile käynnistää sovellus uudelleen

---

*Tämä ohje päivitetty: 23.12.2025*
