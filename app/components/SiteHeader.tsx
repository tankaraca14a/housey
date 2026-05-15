"use client";

// Client header: nav labels flip with the language picker. Extracted out
// of app/layout.tsx so the layout itself can stay a server component (it
// owns `metadata` export which "use client" pages cannot).

import Link from "next/link";
import { LangPicker } from "./LangPicker";
import { useT } from "@/app/components/LangProvider";

export function SiteHeader() {
  const t = useT();
  return (
    <header className="border-b border-white/10 bg-surface-900/80 backdrop-blur">
      <nav className="container flex items-center justify-between h-16 text-sm">
        <Link href="/" className="font-semibold text-brand-400 tracking-wide">Housey</Link>
        {/* Mobile: hide the 6-link nav so the page doesn't overflow horizontally
            at narrow widths. The footer carries the same destinations. Tablet
            and up (sm:flex, ≥640px): show inline. */}
        <ul className="hidden sm:flex gap-6 text-sm text-slate-200">
          <li><Link href="/about" className="hover:text-brand-300 transition-colors">{t("nav.about")}</Link></li>
          <li><Link href="/gallery" className="hover:text-brand-300 transition-colors">{t("nav.gallery")}</Link></li>
          <li><Link href="/location" className="hover:text-brand-300 transition-colors">{t("nav.location")}</Link></li>
          <li><Link href="/booking" className="hover:text-brand-300 transition-colors">{t("nav.booking")}</Link></li>
          <li><Link href="/reviews" className="hover:text-brand-300 transition-colors">{t("nav.reviews")}</Link></li>
          <li><Link href="/contact" className="hover:text-brand-300 transition-colors">{t("nav.contact")}</Link></li>
        </ul>
        <div className="flex items-center gap-3">
          <LangPicker />
          {/* Mobile fallback: a single compact button linking to the gallery. */}
          <Link
            href="/gallery"
            className="sm:hidden text-xs px-3 py-1.5 rounded-lg bg-surface-700 text-slate-200 hover:bg-surface-600 transition border border-white/10"
          >
            {t("nav.menu")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
