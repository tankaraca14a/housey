// Server-side helper for resolving the visitor's chosen language from
// the request cookie. Used by RootLayout (passes the resolved lang into
// LangProvider as initialLang) and by generateMetadata in app/layout.tsx
// (so OG/Twitter previews go out in the right language).
//
// Falls back to DEFAULT_LANG ('en') when no cookie is present or the
// value is unrecognised. Never throws.

import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE_NAME, isLang, type Lang } from "./types";

export async function getServerLang(): Promise<Lang> {
  try {
    const c = await cookies();
    const v = c.get(LANG_COOKIE_NAME)?.value;
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    // cookies() can throw in some edge contexts (route handlers without
    // a request). Defensive fallback so we never crash a render.
    return DEFAULT_LANG;
  }
}
