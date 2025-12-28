// Library utilities
export * from "./database";
export * from "./formatters";
export * from "./exportImport";
export * from "./constants";

/**
 * Finnish translations for common error messages.
 */
const errorTranslations: [RegExp | string, string][] = [
  // File/image errors
  ["Source file does not exist", "Lähdetiedostoa ei löydy"],
  ["Unsupported image format", "Kuvamuotoa ei tueta"],
  ["Invalid entity type", "Virheellinen kohdetyyppi"],

  // SQLite database errors
  [/UNIQUE constraint failed/i, "Tietue on jo olemassa"],
  [/FOREIGN KEY constraint failed/i, "Viittaus virheellinen"],
  [/NOT NULL constraint failed/i, "Pakollinen tieto puuttuu"],
  [/database is locked/i, "Tietokanta on varattu, yritä uudelleen"],
  [/no such table/i, "Tietokantataulua ei löydy"],

  // Google Drive errors
  ["Database not found", "Tietokantaa ei löydy"],
  [/Token refresh failed/i, "Kirjautuminen vanhentunut, kirjaudu uudelleen"],
  [/Invalid OAuth state/i, "Tunnistautumisvirhe"],
  [/Drive API error/i, "Google Drive -yhteysvirhe"],
  [/Upload failed/i, "Lähetys epäonnistui"],
  [/Download failed/i, "Lataus epäonnistui"],
  [/Delete failed/i, "Poisto epäonnistui"],

  // Network errors
  [/Network error/i, "Verkkovirhe"],
  [/Connection refused/i, "Yhteyttä ei saatu"],
  [/fetch failed/i, "Verkkoyhteysvirhe"],
  [/timeout/i, "Aikakatkaisu - yritä uudelleen"],
];

/**
 * Translates an error message to Finnish if a translation exists.
 */
function translateError(message: string): string {
  for (const [pattern, translation] of errorTranslations) {
    if (typeof pattern === "string") {
      if (message.includes(pattern)) {
        return translation;
      }
    } else if (pattern.test(message)) {
      return translation;
    }
  }
  return message;
}

/**
 * Safely extracts error message from unknown error type and translates to Finnish.
 */
export function getErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return translateError(message);
}
