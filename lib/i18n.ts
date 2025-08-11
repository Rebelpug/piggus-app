import { I18n } from "i18n-js";
import * as Localization from "expo-localization";

// Import translation files
import en from "@/translations/en.json";
import es from "@/translations/es.json";
import fr from "@/translations/fr.json";
import de from "@/translations/de.json";
import it from "@/translations/it.json";
import pt from "@/translations/pt.json";
import nl from "@/translations/nl.json";
import pl from "@/translations/pl.json";
import sv from "@/translations/sv.json";

// Create i18n instance
const i18n = new I18n(
  {
    en,
    es,
    fr,
    de,
    it,
    pt,
    nl,
    pl,
    sv,
  },
  {
    defaultLocale: "en",
    enableFallback: true,
  },
);

// Get system language with fallback to English
const getSystemLanguage = (): string => {
  try {
    const systemLocale = Localization.getLocales?.()?.[0]?.languageCode;
    const supportedLanguages = [
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "nl",
      "pl",
      "sv",
    ];

    if (!systemLocale) {
      console.log("No system locale detected, falling back to English");
      return "en";
    }

    // Extract language code from locale (e.g., 'en-US' -> 'en')
    const languageCode = systemLocale.includes("-")
      ? systemLocale.split("-")[0]
      : systemLocale;

    // Return the language code if supported, otherwise default to English
    const selectedLanguage = supportedLanguages.includes(languageCode)
      ? languageCode
      : "en";
    console.log(
      `Detected system language: ${systemLocale}, using: ${selectedLanguage}`,
    );
    return selectedLanguage;
  } catch (error) {
    console.warn("Error detecting system language:", error);
    return "en";
  }
};

// Set initial locale with fallback
try {
  i18n.locale = getSystemLanguage();
} catch (error) {
  console.warn("Error setting initial locale:", error);
  i18n.locale = "en";
}

export default i18n;
export { getSystemLanguage };
