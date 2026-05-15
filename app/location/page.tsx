"use client";

import Image from "next/image";
import { useT } from "@/app/components/LangProvider";

export default function LocationPage() {
  const t = useT();
  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{t("location.title")}</h1>
          <p className="text-slate-300 text-lg">{t("location.subtitle")}</p>
        </div>

        <div className="relative h-[400px] rounded-2xl overflow-hidden mb-12">
          <Image
            src="/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg"
            alt={t("location.imageAlt")}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-8">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("location.gettingHereTitle")}</h2>
            <div className="mb-6 p-4 bg-brand-500/10 border border-brand-400/30 rounded-xl">
              <h3 className="text-brand-400 font-semibold mb-2">{t("location.addressLabel")}</h3>
              <p className="text-white text-lg">Tankaraca 14a</p>
              <p className="text-white text-lg">Vela Luka, Korčula</p>
              <p className="text-white text-lg">Croatia</p>
              <div className="mt-4 pt-4 border-t border-brand-400/20">
                <p className="text-slate-300 mb-2"><strong>{t("location.gpsLabel")}</strong></p>
                <p className="text-white font-mono">42.9604° N, 16.7147° E</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Tankaraca+14a+Vela+Luka+Korcula+Croatia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition"
                >
                  {t("location.openMaps")}
                </a>
              </div>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              {t("location.introPara")}
            </p>
            <div className="space-y-3 text-slate-300">
              <p>✈️ <strong>{t("location.airportLabel")}</strong> {t("location.airportValue")}</p>
              <p>⛴️ <strong>{t("location.ferryLabel")}</strong> {t("location.ferryValue")}</p>
              <p>🚗 <strong>{t("location.carLabel")}</strong> {t("location.carValue")}</p>
              <p>🚢 <strong>{t("location.dubrovnikLabel")}</strong> {t("location.dubrovnikValue")}</p>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("location.attractionsTitle")}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-brand-400 mb-3">{t("location.natureBeachesTitle")}</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• {t("location.natureBullet1")}</li>
                  <li>• {t("location.natureBullet2")}</li>
                  <li>• {t("location.natureBullet3")}</li>
                  <li>• {t("location.natureBullet4")}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-brand-400 mb-3">{t("location.localAmenitiesTitle")}</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• {t("location.localBullet1")}</li>
                  <li>• {t("location.localBullet2")}</li>
                  <li>• {t("location.localBullet3")}</li>
                  <li>• {t("location.localBullet4")}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("location.mapTitle")}</h2>
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.7!2d16.7147!3d42.9604!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDLCsDU3JzM3LjQiTiAxNsKwNDInNTIuOSJF!5e0!3m2!1sen!2s!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-xl"
              />
            </div>
            <p className="text-slate-400 text-sm mt-3 text-center">
              {t("location.mapCaption")}
            </p>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">{t("location.aboutVlTitle")}</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              {t("location.aboutVlP1")}
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              {t("location.aboutVlP2")}
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              {t("location.aboutVlP3")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
