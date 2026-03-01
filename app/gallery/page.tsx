"use client";

import Image from "next/image";
import { useState } from "react";

type Category = "all" | "aerial" | "coast";

interface GalleryImage {
  src: string;
  alt: string;
  category: Category[];
  featured?: boolean;
}

const images: GalleryImage[] = [
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg", alt: "Aerial view of the property and coastline", category: ["aerial"], featured: true },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.26.jpeg", alt: "Aerial coastal view", category: ["aerial"], featured: true },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (1).jpeg", alt: "Aerial view of the coast", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (2).jpeg", alt: "Coastal aerial panorama", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (3).jpeg", alt: "Rocky shoreline from above", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27.jpeg", alt: "Dalmatian coast aerial view", category: ["aerial"], featured: true },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (1).jpeg", alt: "Coastline and property from above", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (2).jpeg", alt: "Aerial view of turquoise waters", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (3).jpeg", alt: "Aerial coastal landscape", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (4).jpeg", alt: "House and rocky beach from above", category: ["aerial"], featured: true },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (5).jpeg", alt: "Shoreline aerial view", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.28.jpeg", alt: "Coastal property aerial", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (1).jpeg", alt: "Aerial view of the coastline", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (2).jpeg", alt: "Coastal land and sea from above", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (3).jpeg", alt: "Dalmatian coastline panorama", category: ["aerial"] },
  { src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (4).jpeg", alt: "Coastal area aerial perspective", category: ["aerial"] },
  { src: "/images/new/interior-01.jpg", alt: "Rocky shore and crystal clear water", category: ["coast"], featured: true },
  { src: "/images/new/interior-02.jpg", alt: "Clear water with distant hills", category: ["coast"] },
  { src: "/images/new/interior-03.jpg", alt: "Transparent sea over rocky bottom", category: ["coast"] },
  { src: "/images/new/interior-04.jpg", alt: "Coastal path to the sea", category: ["coast"] },
  { src: "/images/new/interior-05.jpg", alt: "Crystal clear Adriatic water", category: ["coast"] },
  { src: "/images/new/interior-06.jpg", alt: "Rocky shoreline and turquoise sea", category: ["coast"] },
];

const categoryLabels: Record<Category, string> = {
  all: "All Photos",
  aerial: "Aerial Views",
  coast: "Sea & Coast",
};

const categoryIcons: Record<Category, string> = {
  all: "🏡",
  aerial: "🚁",
  coast: "🌊",
};

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredImages =
    activeCategory === "all"
      ? images
      : images.filter((img) => img.category.includes(activeCategory));

  const closeLightbox = () => setLightboxIndex(null);
  const lightboxPrev = () => { if (lightboxIndex === null) return; setLightboxIndex((lightboxIndex - 1 + filteredImages.length) % filteredImages.length); };
  const lightboxNext = () => { if (lightboxIndex === null) return; setLightboxIndex((lightboxIndex + 1) % filteredImages.length); };

  const featuredImages = filteredImages.filter((img) => img.featured);
  const regularImages = filteredImages.filter((img) => !img.featured);

  return (
    <div className="min-h-screen bg-surface-900">
      <div className="container pt-16 pb-10 text-center">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-4">Dalmatian Coast</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">Gallery</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Azure waters, rocky shores, and stunning aerial views of our Dalmatian coast property.
        </p>
      </div>

      <div className="container mb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {(["all", "aerial", "coast"] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                  : "bg-surface-700/60 text-slate-300 hover:bg-surface-600/80 hover:text-white border border-white/10"
              }`}
            >
              <span className="mr-1.5">{categoryIcons[cat]}</span>
              {categoryLabels[cat]}
              <span className="ml-2 text-xs opacity-70">
                ({cat === "all" ? images.length : images.filter((img) => img.category.includes(cat)).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="container pb-24">
        {featuredImages.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-3 grid-rows-2 gap-4" style={{ height: "65vh" }}>
              <button onClick={() => setLightboxIndex(filteredImages.indexOf(featuredImages[0]))} className="relative col-span-2 row-span-2 rounded-2xl overflow-hidden group">
                <Image src={featuredImages[0].src} alt={featuredImages[0].alt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              {featuredImages.slice(1, 3).map((img, i) => (
                <button key={i} onClick={() => setLightboxIndex(filteredImages.indexOf(img))} className="relative rounded-2xl overflow-hidden group">
                  <Image src={img.src} alt={img.alt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {regularImages.length > 0 && (
          <div className="mt-4 columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {regularImages.map((img, i) => (
              <button key={i} onClick={() => setLightboxIndex(filteredImages.indexOf(img))} className="relative w-full overflow-hidden rounded-xl group break-inside-avoid block">
                <Image src={img.src} alt={img.alt} width={600} height={400} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/96 z-50 flex items-center justify-center" onClick={closeLightbox}>
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] mx-auto px-16" onClick={(e) => e.stopPropagation()}>
            <Image src={filteredImages[lightboxIndex].src} alt={filteredImages[lightboxIndex].alt} fill className="object-contain" />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white px-6 py-2 rounded-full text-sm">
            {filteredImages[lightboxIndex].alt} · {lightboxIndex + 1} / {filteredImages.length}
          </div>
          <button onClick={(e) => { e.stopPropagation(); lightboxPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white w-12 h-12 rounded-full flex items-center justify-center transition text-xl">←</button>
          <button onClick={(e) => { e.stopPropagation(); lightboxNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white w-12 h-12 rounded-full flex items-center justify-center transition text-xl">→</button>
          <button onClick={closeLightbox} className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white w-10 h-10 rounded-full flex items-center justify-center transition text-lg">✕</button>
        </div>
      )}
    </div>
  );
}
