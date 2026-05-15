// Central source of truth for which languages the site supports.
// Adding a new language: extend SUPPORTED_LANGS + add its column in
// every translation table.

export const SUPPORTED_LANGS = ["en", "hr", "de", "it", "fr"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

// The label is what the picker shows in the dropdown for each option.
// Native name on purpose: a French visitor recognises "Français" instantly,
// "FR" or "French" less so.
export const LANG_LABELS: Record<Lang, { short: string; native: string }> = {
  en: { short: "EN", native: "English" },
  hr: { short: "HR", native: "Hrvatski" },
  de: { short: "DE", native: "Deutsch" },
  it: { short: "IT", native: "Italiano" },
  fr: { short: "FR", native: "Français" },
};

// localStorage key used by LangProvider to persist the chosen language
// across navigations and across sessions on the same device.
export const LANG_STORAGE_KEY = "housey-lang";

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (SUPPORTED_LANGS as readonly string[]).includes(v);
}
