"use client";

// Small dropdown that lives in the top nav on every page. Shows the
// current language's short code (EN / HR / DE / IT / FR) and, when
// focused/opened, lets the user pick another. Uses a plain <select>
// for accessibility — native keyboard, screen-reader, mobile.

import { useLang } from "./LangProvider";
import { SUPPORTED_LANGS, LANG_LABELS, isLang } from "@/app/lib/i18n/types";

interface Props {
  className?: string;
}

export function LangPicker({ className = "" }: Props) {
  const { lang, setLang } = useLang();
  return (
    <label className={`inline-flex items-center gap-1 text-xs ${className}`}>
      {/* Visually-hidden text so screen readers announce what the picker is for */}
      <span className="sr-only">Language</span>
      <select
        value={lang}
        onChange={(e) => {
          if (isLang(e.target.value)) setLang(e.target.value);
        }}
        data-testid="lang-picker"
        className="bg-surface-700 text-slate-200 border border-white/10 rounded-lg px-2 py-1 text-xs font-semibold tracking-wide hover:bg-surface-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label="Language"
      >
        {SUPPORTED_LANGS.map((code) => (
          <option key={code} value={code}>
            {LANG_LABELS[code].short} — {LANG_LABELS[code].native}
          </option>
        ))}
      </select>
    </label>
  );
}
