"use client";

// Client footer: copyright + credit line flip with the picker. Address +
// phone number stay literal (no translation needed). Extracted out of
// app/layout.tsx for the same reason as SiteHeader.

import SocialLinks from "./SocialLinks";
import { useT } from "@/app/components/LangProvider";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-white/10 mt-16 bg-surface-900/80">
      <div className="container py-8 text-sm text-slate-300">
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between mb-4">
          <div>
            <p className="font-semibold text-brand-400 mb-1">Housey - Vela Luka</p>
            <p className="text-slate-400">Tankaraca 14a, Vela Luka, Korčula, Croatia</p>
          </div>
          <div className="text-slate-400">
            <a href="mailto:tankaraca14a@gmail.com" className="hover:text-brand-400 transition">
              tankaraca14a@gmail.com
            </a>
            <p>+385 91 2055969</p>
            <SocialLinks variant="footer" className="mt-2" />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between pt-4 border-t border-white/5">
          <p>© {new Date().getFullYear()} Housey. {t("footer.rights")}</p>
          <p className="text-slate-400">{t("footer.builtBy")}</p>
        </div>
      </div>
    </footer>
  );
}
