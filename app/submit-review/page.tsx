"use client";

// Bookmarked owner-only page where Ivana drops a raw review for Mihaela
// to translate locally and publish to the site. Same admin password as
// /admin (no separate role; this is a Mihaela+Ivana surface, not a
// public form). NOT linked from the public site navigation — Ivana
// keeps the URL bookmarked.

import { useState } from "react";
import { useT } from "@/app/components/LangProvider";
import type { Lang } from "@/app/lib/i18n/types";

export default function SubmitReviewPage() {
  const t = useT();

  // Same session-only password gate pattern as /admin: typed in, held
  // in React state, cleared on tab close. The first call (POST) is what
  // actually validates the password — if it returns 401 we show the
  // wrong-password message and stay on the unlock screen.
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("Airbnb");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quote, setQuote] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);

  async function handleUnlock() {
    setAuthError(null);
    // Validate the password by hitting the GET endpoint (cheap, returns
    // an array — no side effects). If it works, mark authed.
    try {
      const r = await fetch("/api/admin/submitted-reviews", {
        headers: { "x-admin-password": password },
      });
      if (r.status === 401) {
        setAuthError(t("submit.wrongPassword"));
        return;
      }
      setAuthed(true);
    } catch {
      setAuthError(t("submit.wrongPassword"));
    }
  }

  async function handleSubmit() {
    setSending(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/admin/submitted-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          author: author.trim(),
          source: source.trim(),
          rating,
          quote: quote.trim(),
          date,
          lang,
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "send failed");
      }
      setSentOk(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "send failed");
    } finally {
      setSending(false);
    }
  }

  function resetForAnother() {
    setSentOk(false);
    setAuthor("");
    setSource("Airbnb");
    setRating(5);
    setDate(new Date().toISOString().slice(0, 10));
    setQuote("");
    setLang("en");
    setNotes("");
    setSubmitError(null);
  }

  // ── Unauth screen ────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-800 border border-white/10 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">{t("submit.title")}</h1>
          <p className="text-sm text-slate-400">{t("submit.passwordPrompt")}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
            placeholder={t("submit.passwordPlaceholder")}
            data-testid="submit-password"
            autoFocus
            className="w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
          />
          {authError && (
            <p className="text-red-400 text-sm" data-testid="submit-auth-error">{authError}</p>
          )}
          <button
            onClick={handleUnlock}
            data-testid="submit-unlock"
            className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition"
          >
            {t("submit.unlock")}
          </button>
        </div>
      </main>
    );
  }

  // ── Thanks screen ─────────────────────────────────────────────────────────
  if (sentOk) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-800 border border-brand-400/30 rounded-2xl p-6 space-y-4 text-center" data-testid="submit-thanks">
          <h1 className="text-2xl font-bold text-white">{t("submit.thanksTitle")}</h1>
          <p className="text-sm text-slate-300">{t("submit.thanksBody")}</p>
          <button
            onClick={resetForAnother}
            data-testid="submit-another"
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-slate-200 text-sm font-semibold rounded-xl transition border border-white/10"
          >
            {t("submit.submitAnother")}
          </button>
        </div>
      </main>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto bg-surface-800 border border-white/10 rounded-2xl p-6 space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-white">{t("submit.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("submit.subtitle")}</p>
        </header>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">
            {t("submit.authorLabel")}
            <input
              type="text"
              dir="auto"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              data-testid="submit-author"
              className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
            />
          </label>
          <label className="text-sm text-slate-300">
            {t("submit.sourceLabel")}
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              data-testid="submit-source"
              className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
            />
          </label>
          <div className="text-sm text-slate-300">
            <span className="block">{t("submit.ratingLabel")}</span>
            <div
              role="radiogroup"
              aria-label={t("submit.ratingLabel")}
              data-testid="submit-rating"
              className="mt-1 w-full flex items-center gap-1 px-3 py-2 bg-surface-700 border border-white/10 rounded-lg select-none"
            >
              {[1, 2, 3, 4, 5].map((i) => {
                const active = i <= rating;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={i === rating}
                    aria-label={`${i} / 5`}
                    data-testid={`submit-rating-${i}`}
                    onClick={() => setRating(i as 1 | 2 | 3 | 4 | 5)}
                    className={`text-2xl leading-none px-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded ${
                      active ? "text-amber-400" : "text-slate-500 hover:text-amber-300"
                    }`}
                  >
                    ★
                  </button>
                );
              })}
              <span className="ml-auto text-slate-400 text-xs tabular-nums">
                {rating}/5
              </span>
            </div>
          </div>
          <label className="text-sm text-slate-300">
            {t("submit.dateLabel")}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="submit-date"
              className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
            />
          </label>
        </div>

        <label className="text-sm text-slate-300 block">
          {t("submit.langLabel")}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            data-testid="submit-lang"
            className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="en">EN — English</option>
            <option value="hr">HR — Hrvatski</option>
            <option value="de">DE — Deutsch</option>
            <option value="it">IT — Italiano</option>
            <option value="fr">FR — Français</option>
          </select>
        </label>

        <label className="text-sm text-slate-300 block">
          {t("submit.quoteLabel")}
          <textarea
            dir="auto"
            rows={5}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            data-testid="submit-quote"
            className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
          />
        </label>

        <label className="text-sm text-slate-300 block">
          {t("submit.notesLabel")}
          <textarea
            dir="auto"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("submit.notesPlaceholder")}
            data-testid="submit-notes"
            className="mt-1 w-full px-3 py-2 bg-surface-700 border border-white/10 rounded-lg text-white text-sm"
          />
        </label>

        {submitError && (
          <p className="text-red-400 text-sm" data-testid="submit-error">{submitError}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={sending}
          data-testid="submit-send"
          className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
        >
          {sending ? t("submit.sending") : t("submit.submitButton")}
        </button>
      </div>
    </main>
  );
}
