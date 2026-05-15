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
  LANG_COOKIE_NAME,
  LANG_STORAGE_KEY,
  isLang,
  type Lang,
} from "@/app/lib/i18n/types";

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  children,
  initialLang = DEFAULT_LANG,
}: {
  children: ReactNode;
  // RootLayout reads the cookie via next/headers and passes the
  // resolved language in. This means the first render — both on the
  // server and on the client during hydration — already shows content
  // in the user's chosen language, with no flash of English.
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Belt-and-braces: if for some reason the cookie wasn't seen by the
  // server (e.g., first visit just after the user picked HR on a page
  // we hadn't routed through yet, or a stale CDN response), pick up
  // localStorage on mount too. The cookie is authoritative going
  // forward; localStorage is a fallback for older sessions.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (raw && isLang(raw) && raw !== lang) setLangState(raw);
    } catch {
      // localStorage can throw in private windows; stay on initialLang.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
      // Also write a long-lived cookie so server renders + metadata can
      // honour the choice on the next request. 1 year; SameSite=Lax so
      // it travels on top-level navigations but not cross-site.
      document.cookie = `${LANG_COOKIE_NAME}=${next}; max-age=31536000; path=/; SameSite=Lax`;
    } catch {
      // best-effort persistence; in-memory state still updates so the
      // page reacts immediately even if storage / cookie write fails.
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

// Convenience: get a translator function bound to the current language.
// Use in client components:
//   const t = useT();
//   <h1>{t('home.featuresTitle')}</h1>
// The dict lives in app/lib/i18n/public.ts. Adding a new key there gets
// you typechecked completion at every call site.
import { publicTranslations, type PublicStrings } from "@/app/lib/i18n/public";
export function useT(): (key: keyof PublicStrings) => string {
  const { lang } = useLang();
  return (key) => publicTranslations[lang][key];
}
