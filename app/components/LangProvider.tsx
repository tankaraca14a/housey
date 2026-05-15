"use client";

// Client-side language context. Renders nothing visible itself; wraps the
// app so any descendant client component can call useLang() to read the
// current language and setLang() to switch.
//
// First render is intentionally always DEFAULT_LANG ("en") so the server
// and client agree on the initial markup — no hydration mismatch. After
// mount, a useEffect reads localStorage and switches if a saved choice
// exists. The brief flash of EN before HR/DE/IT/FR is acceptable for a
// low-traffic rental site and avoids the cost of cookie-based SSR.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  isLang,
  type Lang,
} from "@/app/lib/i18n/types";

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Hydrate from localStorage after mount. If the stored value is invalid
  // (older key, manual tampering) we silently ignore it and stay on
  // DEFAULT_LANG.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (raw && isLang(raw)) setLangState(raw);
    } catch {
      // localStorage can throw in private windows; just stay on default.
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // best-effort persistence; in-memory state still updates so the
      // page reacts immediately even if storage write fails.
    }
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Used outside the provider tree (shouldn't happen in our layout):
    // fall back to defaults rather than crashing. Useful in unit tests
    // and during SSR before the provider mounts.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
    };
  }
  return ctx;
}
