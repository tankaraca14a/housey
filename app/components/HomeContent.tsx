"use client";

// Translatable home-page content (hero + features). Sibling to the
// FeaturedReviewsStrip which is server-rendered separately.

import Link from "next/link";
import Image from "next/image";
import { useT } from "@/app/components/LangProvider";

export function HomeContent() {
  const t = useT();
  return (
    <>
      {/* Hero Section with Big Image */}
      <section className="relative h-[70vh] min-h-[500px]">
        <Image
          src="/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg"
          alt={t("home.heroAlt")}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-surface-900"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container text-center">
            <h1 className="text-6xl md:text-[120px] font-black tracking-tight text-white mb-6 leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
              HOUSEY
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow-lg">
              {t("home.heroSubtitle")}
            </p>
            <Link
              href="/booking"
              className="px-8 py-4 rounded-xl bg-brand-500 text-white text-lg shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 inline-block"
            >
              {t("home.bookNow")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-6">
              {t("home.featuresEyebrow")}
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight text-white mb-6">
              {t("home.featuresTitle")}
            </h2>
            <p className="text-lg text-slate-300 max-w-xl">
              {t("home.featuresParagraph")}
            </p>
            <ul className="mt-10 grid md:grid-cols-2 gap-4 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✔</span> {t("home.featureSeaView")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✔</span> {t("home.featurePeaceful")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✔</span> {t("home.featureEquipped")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✔</span> {t("home.featureWifi")}
              </li>
            </ul>
            <div className="mt-8">
              <Link
                href="/gallery"
                className="text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-2"
              >
                {t("home.viewGallery")}
              </Link>
            </div>
          </div>
          <div className="bg-surface-700/60 border border-white/10 rounded-2xl p-10 shadow-2xl shadow-black/30">
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-100">
              <div className="p-4 border border-sea-700/50 rounded-xl bg-sea-900/40">{t("home.pillBeach")}</div>
              <div className="p-4 border border-sea-700/50 rounded-xl bg-sea-900/40">{t("home.pillKitchen")}</div>
              <div className="p-4 border border-sea-700/50 rounded-xl bg-sea-900/40">{t("home.pillTerrace")}</div>
              <div className="p-4 border border-sea-700/50 rounded-xl bg-sea-900/40">{t("home.pillSunset")}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
