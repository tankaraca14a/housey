"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/app/components/LangProvider";

export default function AboutPage() {
  const t = useT();
  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{t("about.title")}</h1>
          <p className="text-slate-300 text-lg">{t("about.subtitle")}</p>
        </div>

        <div className="relative h-[400px] rounded-2xl overflow-hidden mb-12">
          <Image
            src="/images/WhatsApp Image 2025-11-07 at 00.06.28.jpeg"
            alt={t("about.imageAlt")}
            fill
            className="object-cover"
          />
        </div>

        <div className="prose prose-invert max-w-none">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("about.welcomeTitle")}</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              {t("about.welcomeParagraph")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-800 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">{t("about.featuresTitle")}</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• {t("about.featureBedrooms")}</li>
                <li>• {t("about.featureBathrooms")}</li>
                <li>• {t("about.featureKitchen")}</li>
                <li>• {t("about.featureLiving")}</li>
                <li>• {t("about.featureTerrace")}</li>
                <li>• {t("about.featureParking")}</li>
              </ul>
            </div>

            <div className="bg-surface-800 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">{t("about.amenitiesTitle")}</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• {t("about.amenityAcHeat")}</li>
                <li>• {t("about.amenityWifi")}</li>
                <li>• {t("about.amenityTv")}</li>
                <li>• {t("about.amenityBbq")}</li>
                <li>• {t("about.amenityBeach")}</li>
                <li>• {t("about.amenityLinens")}</li>
              </ul>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("about.locationTitle")}</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              {t("about.locationP1")}
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              {t("about.locationP2")}
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/booking"
              className="inline-block px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition"
            >
              {t("about.bookCta")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
