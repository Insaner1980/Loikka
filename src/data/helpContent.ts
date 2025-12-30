// Help content data structure for the in-app help panel
// Based on docs/USER_GUIDE.md

export interface HelpSection {
  id: string;
  title: string;
  description: string;
  content: HelpContent[];
  keywords: string[]; // For search
}

export interface HelpContent {
  type: "paragraph" | "heading" | "list" | "numbered-list" | "table" | "note";
  text?: string;
  items?: string[];
  rows?: { cols: string[] }[];
  headers?: string[];
}

export const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Aloitus",
    description: "Ensimmäiset askeleet",
    keywords: ["aloitus", "ensimmäinen", "urheilija", "tulos", "lisää", "lisääminen", "tallenna"],
    content: [
      {
        type: "heading",
        text: "Ensimmäinen urheilija",
      },
      {
        type: "numbered-list",
        items: [
          "Avaa Urheilijat-sivu (sivupalkista tai paina 2)",
          "Klikkaa \"Lisää urheilija\" -nappia (tai paina Ctrl+U)",
          "Täytä etunimi, sukunimi ja syntymävuosi",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "heading",
        text: "Ensimmäinen tulos",
      },
      {
        type: "numbered-list",
        items: [
          "Avaa Tulokset-sivu (sivupalkista tai paina 3)",
          "Klikkaa \"Lisää tulos\" (tai Ctrl+U)",
          "Valitse urheilija, laji, tulos ja päivämäärä",
          "Klikkaa Tallenna",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Lähtöviiva",
    description: "Etusivun käyttö",
    keywords: ["lähtöviiva", "etusivu", "dashboard", "tilastot", "kilpailut", "tulokset", "yleiskatsaus"],
    content: [
      {
        type: "paragraph",
        text: "Lähtöviiva on sovelluksen etusivu. Siinä näet yhdellä silmäyksellä:",
      },
      {
        type: "heading",
        text: "Tilastokortit",
      },
      {
        type: "list",
        items: [
          "Urheilijat - Kuinka monta urheilijaa on kirjattu",
          "Tulokset - Tulosten kokonaismäärä",
          "Ennätyksiä - Tänä vuonna rikotut ennätykset",
          "Mitalit - Mitaleiden kokonaismäärä",
        ],
      },
      {
        type: "heading",
        text: "Tulevat kilpailut",
      },
      {
        type: "paragraph",
        text: "Lista lähestyvistä kilpailuista päivämäärän mukaan järjestettynä.",
      },
      {
        type: "heading",
        text: "Viimeisimmät tulokset",
      },
      {
        type: "paragraph",
        text: "Kolme viimeksi lisättyä tulosta. OE-, KE- ja SE-merkinnät näkyvät, jos tulos on ennätys.",
      },
    ],
  },
  {
    id: "athletes",
    title: "Urheilijat",
    description: "Urheilijoiden hallinta",
    keywords: ["urheilija", "lisää", "muokkaa", "poista", "profiilikuva", "ikäluokka", "seura", "nimi"],
    content: [
      {
        type: "heading",
        text: "Urheilijalista",
      },
      {
        type: "paragraph",
        text: "Urheilijat-sivulla näet kaikki urheilijat kortteina. Jokaisessa kortissa näkyy profiilikuva, nimi, ikäluokka, seura, mitalit ja ennätysten määrä.",
      },
      {
        type: "heading",
        text: "Urheilijan lisääminen",
      },
      {
        type: "numbered-list",
        items: [
          "Klikkaa \"Lisää urheilija\"",
          "Täytä etunimi, sukunimi ja syntymävuosi",
          "Seura (valinnainen)",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "heading",
        text: "Urheilijan muokkaaminen",
      },
      {
        type: "paragraph",
        text: "Avaa urheilijan profiili ja klikkaa \"Muokkaa\" ylhäällä.",
      },
      {
        type: "heading",
        text: "Urheilijan poistaminen",
      },
      {
        type: "paragraph",
        text: "Avaa urheilijan profiili ja klikkaa roskakori-ikonia ylhäällä.",
      },
      {
        type: "heading",
        text: "Ikäluokat",
      },
      {
        type: "paragraph",
        text: "Sovellus laskee ikäluokan automaattisesti syntymävuoden perusteella:",
      },
      {
        type: "table",
        headers: ["Merkintä", "Selitys"],
        rows: [
          { cols: ["T7, T9, T11...", "Tyttö, ikäluokat 7, 9, 11, 13, 15, 17"] },
          { cols: ["N", "Nainen (aikuinen)"] },
        ],
      },
    ],
  },
  {
    id: "results",
    title: "Tulokset",
    description: "Tulosten kirjaaminen",
    keywords: ["tulos", "lisää", "aika", "matka", "tuuli", "ennätys", "OE", "KE", "SE", "DNS", "DNF", "DQ", "NM", "status"],
    content: [
      {
        type: "heading",
        text: "Tuloksen lisääminen",
      },
      {
        type: "numbered-list",
        items: [
          "Klikkaa \"Lisää tulos\"",
          "Valitse urheilija ja laji",
          "Kirjoita tulos (aika tai matka)",
          "Valitse päivämäärä ja tyyppi (kilpailu/harjoitus)",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "heading",
        text: "Tulosmuodot",
      },
      {
        type: "table",
        headers: ["Lajityyppi", "Esimerkki"],
        rows: [
          { cols: ["Pikajuoksu", "8.54"] },
          { cols: ["Keskimatka", "2:34.56"] },
          { cols: ["Kestävyys", "11:23.45"] },
          { cols: ["Maastojuoksu", "15:45.00"] },
          { cols: ["Viestit", "52.34"] },
          { cols: ["Kävely", "5:23.45"] },
          { cols: ["Hypyt", "4.25"] },
          { cols: ["Heitot", "28.50"] },
          { cols: ["Cooper", "2150 m (kokonaiset metrit)"] },
          { cols: ["Moniottelu", "2345 p (pisteet)"] },
        ],
      },
      {
        type: "heading",
        text: "Tuuli",
      },
      {
        type: "paragraph",
        text: "Pikajuoksuissa, pituushypyssä, kolmiloikassa ja aitajuoksuissa voit kirjata tuulen (esim. +1.8 tai -0.5). Jos tuuli on yli +2.0 m/s, tulos merkitään tuuliavusteiseksi (14v ja vanhemmat).",
      },
      {
        type: "heading",
        text: "Tuloksen status",
      },
      {
        type: "table",
        headers: ["Status", "Milloin käytetään"],
        rows: [
          { cols: ["Hyväksytty", "Normaali hyväksytty tulos"] },
          { cols: ["NM", "Ei tulosta (kaikki hypyt epäonnistuneet)"] },
          { cols: ["DNS", "Ei startannut (sairastui)"] },
          { cols: ["DNF", "Keskeytti kesken"] },
          { cols: ["DQ", "Hylätty sääntörikkomuksesta"] },
        ],
      },
      {
        type: "heading",
        text: "Ennätykset",
      },
      {
        type: "list",
        items: [
          "OE (Oma ennätys) = Paras tulos koskaan kyseisessä lajissa",
          "KE (Kauden ennätys) = Paras tulos tänä vuonna",
          "SE (Suomen ennätys) = Suomen ennätys",
        ],
      },
      {
        type: "note",
        text: "Tuuliavusteiset tulokset (tuuli > +2.0 m/s) eivät voi olla virallisia ennätyksiä 14-vuotiailla ja vanhemmilla.",
      },
    ],
  },
  {
    id: "competitions",
    title: "Kilpailut",
    description: "Kilpailujen hallinta",
    keywords: ["kilpailu", "lisää", "osallistuja", "taso", "SM", "PM", "piiri", "seura", "hallikisat", "aluekisat", "pohjola", "seuracup", "koululaiskisat"],
    content: [
      {
        type: "heading",
        text: "Kilpailun lisääminen",
      },
      {
        type: "numbered-list",
        items: [
          "Klikkaa \"Lisää kilpailu\"",
          "Anna kilpailun nimi ja päivämäärä",
          "Valitse paikka ja taso (valinnaisia)",
          "Valitse lajit ja osallistujat",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "heading",
        text: "Kilpailun taso",
      },
      {
        type: "list",
        items: [
          "Seurakisat",
          "Koululaiskisat",
          "Seuran sisäiset kisat",
          "Seuraottelut",
          "Piirikisat",
          "Piirinmestaruuskilpailut (PM)",
          "Hallikisat",
          "Aluekisat",
          "Pohjola Seuracup",
          "SM-kilpailut",
        ],
      },
    ],
  },
  {
    id: "calendar",
    title: "Kalenteri",
    description: "Kalenterinäkymä",
    keywords: ["kalenteri", "kuukausi", "päivä", "navigointi", "näppäin"],
    content: [
      {
        type: "paragraph",
        text: "Kalenteri-sivu näyttää kuukausinäkymän kilpailuista.",
      },
      {
        type: "heading",
        text: "Käyttö",
      },
      {
        type: "list",
        items: [
          "Vaihda kuukautta nuolilla tai ← → näppäimillä",
          "Mene tähän päivään painamalla T",
          "Klikkaa päivää nähdäksesi kilpailun tiedot",
        ],
      },
      {
        type: "paragraph",
        text: "Päivät joissa on kilpailu on merkitty pisteellä.",
      },
    ],
  },
  {
    id: "statistics",
    title: "Tilastot",
    description: "Kaaviot ja kehitys",
    keywords: ["tilasto", "kaavio", "kehitys", "vertailu", "suodatin"],
    content: [
      {
        type: "paragraph",
        text: "Tilastot-sivulla näet kaavioita urheilijoiden kehityksestä.",
      },
      {
        type: "heading",
        text: "Saatavilla olevat näkymät",
      },
      {
        type: "list",
        items: [
          "Tuloskehitys - Miten tulokset ovat kehittyneet",
          "Lajivertailu - Tulokset eri lajeissa",
          "Vuosivertailu - Eri vuosien tulosten vertailu",
        ],
      },
      {
        type: "heading",
        text: "Suodattimet",
      },
      {
        type: "paragraph",
        text: "Voit valita urheilijan, lajin ja aikavälin näytettäville tilastoille.",
      },
    ],
  },
  {
    id: "goals",
    title: "Tavoitteet",
    description: "Tavoitteiden seuranta",
    keywords: ["tavoite", "lisää", "seuranta", "edistyminen", "saavutettu"],
    content: [
      {
        type: "heading",
        text: "Tavoitteen lisääminen",
      },
      {
        type: "numbered-list",
        items: [
          "Klikkaa \"Lisää tavoite\"",
          "Valitse urheilija ja laji",
          "Kirjoita tavoitetulos (esim. 60m alle 9.00)",
          "Valitse tavoitepäivä (valinnainen)",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "heading",
        text: "Tavoitteen seuranta",
      },
      {
        type: "paragraph",
        text: "Tavoitekortti näyttää nykyisen parhaan tuloksen, tavoitetuloksen ja edistymisen prosentteina.",
      },
      {
        type: "heading",
        text: "Tilat",
      },
      {
        type: "list",
        items: [
          "Kesken - Tavoitetta ei ole vielä saavutettu",
          "Lähellä! - Alle 10% puuttuu",
          "Saavutettu - Tavoite saavutettu",
        ],
      },
    ],
  },
  {
    id: "photos",
    title: "Kuvat",
    description: "Kuvagallerian käyttö",
    keywords: ["kuva", "galleria", "lisää", "katselu", "urheilija", "tulos"],
    content: [
      {
        type: "heading",
        text: "Kuvien lisääminen",
      },
      {
        type: "paragraph",
        text: "Kuvia voi lisätä kolmella tavalla:",
      },
      {
        type: "numbered-list",
        items: [
          "Urheilijan profiilissa: Avaa profiili → Kuvat-välilehti → Lisää kuva",
          "Tuloksen yhteydessä: Avaa tulos → Lisää kuva",
          "Yleinen galleria: Kuvat-sivu → Lisää kuva",
        ],
      },
      {
        type: "heading",
        text: "Kuvien katselu",
      },
      {
        type: "list",
        items: [
          "Klikkaa kuvaa avataksesi sen isompana",
          "Selaa kuvia ← → nuolinäppäimillä",
          "Sulje painamalla Esc, klikkaamalla × tai kuvan ulkopuolelle",
        ],
      },
    ],
  },
  {
    id: "shortcuts",
    title: "Pikanäppäimet",
    description: "Näppäinoikotiet",
    keywords: ["pikanäppäin", "näppäin", "oikotie", "ctrl", "esc", "numero"],
    content: [
      {
        type: "heading",
        text: "Yleiset",
      },
      {
        type: "table",
        headers: ["Näppäin", "Toiminto"],
        rows: [
          { cols: ["Ctrl + U", "Lisää uusi (riippuu sivusta)"] },
          { cols: ["Esc", "Sulje dialogi / Poistu valintatilasta / Sulje kuva"] },
          { cols: ["Klikkaa tyhjää", "Poistu valintatilasta"] },
        ],
      },
      {
        type: "heading",
        text: "Navigointi",
      },
      {
        type: "table",
        headers: ["Näppäin", "Sivu"],
        rows: [
          { cols: ["1", "Lähtöviiva"] },
          { cols: ["2", "Urheilijat"] },
          { cols: ["3", "Tulokset"] },
          { cols: ["4", "Kalenteri"] },
          { cols: ["5", "Tilastot"] },
          { cols: ["6", "Tavoitteet"] },
          { cols: ["7", "Kuvat"] },
          { cols: ["8", "Asetukset"] },
        ],
      },
      {
        type: "heading",
        text: "Kalenteri",
      },
      {
        type: "table",
        headers: ["Näppäin", "Toiminto"],
        rows: [
          { cols: ["←", "Edellinen kuukausi"] },
          { cols: ["→", "Seuraava kuukausi"] },
          { cols: ["T", "Mene tähän päivään"] },
        ],
      },
      {
        type: "heading",
        text: "Kuvien katselu",
      },
      {
        type: "table",
        headers: ["Näppäin", "Toiminto"],
        rows: [
          { cols: ["←", "Edellinen kuva"] },
          { cols: ["→", "Seuraava kuva"] },
          { cols: ["Esc", "Sulje"] },
        ],
      },
    ],
  },
  {
    id: "glossary",
    title: "Sanasto",
    description: "OE, KE, SE, DNS, DNF...",
    keywords: ["sanasto", "lyhenne", "OE", "KE", "SE", "DNS", "DNF", "DQ", "NM", "tuuli", "ennätys"],
    content: [
      {
        type: "heading",
        text: "Lyhenteet",
      },
      {
        type: "table",
        headers: ["Lyhenne", "Merkitys"],
        rows: [
          { cols: ["OE", "Oma ennätys - paras tulos koskaan"] },
          { cols: ["KE", "Kauden ennätys - paras tulos tänä vuonna"] },
          { cols: ["SE", "Suomen ennätys"] },
          { cols: ["DNS", "Did Not Start - ei startannut"] },
          { cols: ["DNF", "Did Not Finish - keskeytti"] },
          { cols: ["DQ", "Disqualified - hylätty"] },
          { cols: ["NM", "No Mark - ei hyväksyttyä tulosta"] },
          { cols: ["w", "Wind-assisted - tuuliavusteinen (tuuli > +2.0 m/s)"] },
        ],
      },
      {
        type: "heading",
        text: "Lajikategoriat",
      },
      {
        type: "table",
        headers: ["Kategoria", "Lajit"],
        rows: [
          { cols: ["Pikajuoksu", "60m, 100m, 200m, 400m"] },
          { cols: ["Keskimatka", "800m, 1000m, 1500m"] },
          { cols: ["Kestävyys", "3000m, 5000m, 10000m"] },
          { cols: ["Aitajuoksut", "60m aj, 80m aj, 100m aj, 300m aj, 400m aj"] },
          { cols: ["Hypyt", "Pituus, kolmiloikka, korkeus, seiväs"] },
          { cols: ["Heitot", "Kuula, kiekko, keihäs, moukari"] },
          { cols: ["Moniottelu", "3-ottelu, 4-ottelu, 5-ottelu, 7-ottelu"] },
          { cols: ["Kävely", "1000m, 2000m, 3000m, 5000m kävely"] },
          { cols: ["Maastojuoksu", "1km, 2km, 3km, 5km maasto"] },
          { cols: ["Viestit", "4x60m, 4x100m, 4x200m, 4x400m, viestijuoksut"] },
          { cols: ["Muut", "Cooper (12 min juoksu)"] },
        ],
      },
    ],
  },
  {
    id: "backup",
    title: "Varmuuskopiointi",
    description: "Tietojen vienti ja tuonti",
    keywords: ["varmuuskopio", "vienti", "tuonti", "JSON", "tallenna", "palauta"],
    content: [
      {
        type: "heading",
        text: "Vie tiedot (tallenna varmuuskopio)",
      },
      {
        type: "numbered-list",
        items: [
          "Avaa Asetukset",
          "Klikkaa \"Vie tiedot\"",
          "Valitse tallennuspaikka",
          "Anna tiedostolle nimi",
          "Klikkaa Tallenna",
        ],
      },
      {
        type: "paragraph",
        text: "Tiedosto tallentuu .json-muodossa ja sisältää urheilijat, tulokset, kilpailut ja tavoitteet.",
      },
      {
        type: "heading",
        text: "Tuo tiedot (palauta varmuuskopiosta)",
      },
      {
        type: "numbered-list",
        items: [
          "Avaa Asetukset",
          "Klikkaa \"Tuo tiedot\"",
          "Valitse aiemmin tallennettu .json-tiedosto",
          "Klikkaa Avaa",
        ],
      },
      {
        type: "note",
        text: "Tuonti korvaa nykyiset tiedot. Varmista että sinulla on varmuuskopio ennen tuontia.",
      },
      {
        type: "heading",
        text: "Missä tiedot sijaitsevat?",
      },
      {
        type: "paragraph",
        text: "Tiedot tallennetaan automaattisesti kansioon:",
      },
      {
        type: "paragraph",
        text: "C:\\Users\\[käyttäjänimi]\\AppData\\Roaming\\com.loikka.app\\",
      },
      {
        type: "paragraph",
        text: "Pääset sinne painamalla Windows + R, kirjoittamalla %APPDATA%\\com.loikka.app ja painamalla Enter.",
      },
    ],
  },
];

// Search helper function
export function searchHelp(query: string): { section: HelpSection; matchedText: string }[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results: { section: HelpSection; matchedText: string; score: number }[] = [];

  for (const section of helpSections) {
    let score = 0;
    let matchedText = "";

    // Check title
    if (section.title.toLowerCase().includes(normalizedQuery)) {
      score += 10;
      matchedText = section.title;
    }

    // Check description
    if (section.description.toLowerCase().includes(normalizedQuery)) {
      score += 5;
      if (!matchedText) matchedText = section.description;
    }

    // Check keywords
    for (const keyword of section.keywords) {
      if (keyword.toLowerCase().includes(normalizedQuery)) {
        score += 3;
        if (!matchedText) matchedText = keyword;
      }
    }

    // Check content
    for (const content of section.content) {
      if (content.text?.toLowerCase().includes(normalizedQuery)) {
        score += 2;
        if (!matchedText) {
          // Extract snippet around the match
          const idx = content.text.toLowerCase().indexOf(normalizedQuery);
          const start = Math.max(0, idx - 20);
          const end = Math.min(content.text.length, idx + normalizedQuery.length + 40);
          matchedText = (start > 0 ? "..." : "") + content.text.slice(start, end) + (end < content.text.length ? "..." : "");
        }
      }
      if (content.items) {
        for (const item of content.items) {
          if (item.toLowerCase().includes(normalizedQuery)) {
            score += 1;
            if (!matchedText) matchedText = item;
          }
        }
      }
      if (content.rows) {
        for (const row of content.rows) {
          for (const col of row.cols) {
            if (col.toLowerCase().includes(normalizedQuery)) {
              score += 1;
              if (!matchedText) matchedText = row.cols.join(" - ");
            }
          }
        }
      }
    }

    if (score > 0) {
      results.push({ section, matchedText, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.map(({ section, matchedText }) => ({ section, matchedText }));
}
