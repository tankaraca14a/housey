"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Category = "all" | "aerial" | "coast" | "exterior" | "terrace" | "interior";

interface GalleryImage {
  src: string;
  alt: string;
  category: Category[];
  featured?: boolean;
}

const images: GalleryImage[] = [
  // Aerial drone shots (original Nov 7 batch)
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
  // Sea & coast close-ups (new March 2026 batch img01-06, and Nov 9 img03,05,10,13,23,25,26,28,30)
  { src: "/images/new/interior-01.jpg", alt: "Rocky shore and crystal clear water", category: ["coast"], featured: true },
  { src: "/images/new/interior-02.jpg", alt: "Clear water with distant hills", category: ["coast"] },
  { src: "/images/new/interior-03.jpg", alt: "Transparent sea over rocky bottom", category: ["coast"] },
  { src: "/images/new/interior-04.jpg", alt: "Coastal path to the sea", category: ["coast"] },
  { src: "/images/new/interior-05.jpg", alt: "Crystal clear Adriatic water", category: ["coast"] },
  { src: "/images/new/interior-06.jpg", alt: "Rocky shoreline and turquoise sea", category: ["coast"] },
  { src: "/images/new2/img01.jpg", alt: "Calm sea view with rocky shoreline", category: ["coast"] },
  { src: "/images/new2/img02.jpg", alt: "Serene coastline with clear water", category: ["coast"] },
  { src: "/images/new2/img03.jpg", alt: "Crystal clear water and rocky seabed", category: ["coast"] },
  { src: "/images/new2/img04.jpg", alt: "Rocky shore with clear water", category: ["coast"] },
  { src: "/images/new2/img05.jpg", alt: "Path leading down to the sea", category: ["coast"] },
  { src: "/images/new2/img06.jpg", alt: "Clear water and rocky shore", category: ["coast"] },
  { src: "/images/new2/img10.jpg", alt: "Vibrant blue Adriatic waters", category: ["coast"] },
  { src: "/images/new2/img13.jpg", alt: "Coastal dock and rocky beach", category: ["coast"] },
  { src: "/images/new2/img25.jpg", alt: "Sailboat in a clear bay", category: ["coast"], featured: true },
  { src: "/images/new2/img26.jpg", alt: "View from the sea towards the house", category: ["coast"] },
  { src: "/images/new2/img28.jpg", alt: "Dock leading out to the sea", category: ["coast"] },
  { src: "/images/new2/img30.jpg", alt: "Coastal path with rocky terrain", category: ["coast"] },
  // Exterior & terrace
  { src: "/images/new2/img07.jpg", alt: "Bright coastline with leisure area", category: ["exterior"], featured: true },
  { src: "/images/new2/img08.jpg", alt: "Patio with seating and sea view", category: ["terrace"], featured: true },
  { src: "/images/new2/img09.jpg", alt: "Shaded outdoor area with panoramic sea view", category: ["terrace"] },
  { src: "/images/new2/img11.jpg", alt: "Garden with sea in the background at night", category: ["exterior"] },
  { src: "/images/new2/img18.jpg", alt: "Outdoor patio with ocean view and climbing plants", category: ["terrace"] },
  { src: "/images/new2/img19.jpg", alt: "Outdoor seating with garden elements", category: ["terrace"] },
  { src: "/images/new2/img23.jpg", alt: "Open door to terrace with sea view", category: ["terrace"] },
  { src: "/images/new2/img27.jpg", alt: "Terrace sea view through curtain", category: ["terrace"] },
  { src: "/images/new2/img31.jpg", alt: "Terrace dining at sunset with sea view", category: ["terrace", "exterior"], featured: true },
  { src: "/images/new2/img32.jpg", alt: "Terrace dining area with colorful lights at night", category: ["terrace"], featured: true },
  { src: "/images/new2/img33.jpg", alt: "Terrace with barbecue area at night", category: ["terrace"] },
  { src: "/images/new2/img34.jpg", alt: "Stone house at night with illuminated terrace", category: ["exterior"], featured: true },
  { src: "/images/new2/img35.jpg", alt: "House entrance with garden lighting at night", category: ["exterior"] },
  { src: "/images/new2/img36.jpg", alt: "Garden path with outdoor lighting", category: ["exterior"] },
  { src: "/images/new2/img37.jpg", alt: "Terrace garden with decorative lighting", category: ["terrace"] },
  { src: "/images/new2/img38.jpg", alt: "Illuminated outdoor area and garden", category: ["exterior"] },
  // Interior
  { src: "/images/new2/img12.jpg", alt: "Cabin interior with loft bed and seating", category: ["interior"], featured: true },
  { src: "/images/new2/img14.jpg", alt: "Kitchen with rustic design", category: ["interior"], featured: true },
  { src: "/images/new2/img15.jpg", alt: "Interior living area", category: ["interior"] },
  { src: "/images/new2/img16.jpg", alt: "Cabin sitting area with loft view", category: ["interior"] },
  { src: "/images/new2/img17.jpg", alt: "Dining area with garden view", category: ["interior"] },
  { src: "/images/new2/img20.jpg", alt: "Loft sleeping area with window", category: ["interior"] },
  { src: "/images/new2/img21.jpg", alt: "Bathroom with toilet and sink", category: ["interior"] },
  { src: "/images/new2/img22.jpg", alt: "Cozy living area with daybed", category: ["interior"] },
  { src: "/images/new2/img24.jpg", alt: "Garden with colorful flowers near the sea", category: ["exterior"] },
  { src: "/images/new2/img29.jpg", alt: "Sunset dinner on the terrace", category: ["terrace"] },
];

const categoryLabels: Record<Category, string> = {
  all: "All Photos",
  aerial: "Aerial Views",
  coast: "Sea & Coast",
  exterior: "Exterior",
  terrace: "Terrace",
  interior: "Interior",
};

const categoryIcons: Record<Category, string> = {
  all: "🏡",
  aerial: "🚁",
  coast: "🌊",
  exterior: "☀️",
  terrace: "🌿",
  interior: "🛋️",
};

interface ApiImage {
  id: string;
  url: string;
  alt: string;
  categories: string[];
  featured: boolean;
  sortOrder: number;
  width: number;
  height: number;
  caption?: string;
}

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Admin-uploaded images come from /api/images and are merged into the
  // gallery alongside the committed hardcoded set. Committed first
  // (preserving their hand-curated order), then uploads sorted by
  // sortOrder. Each fetched row is reshaped into GalleryImage so the
  // existing render code doesn't care where the image came from.
  const [uploadedImages, setUploadedImages] = useState<GalleryImage[]>([]);
  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((data: { images?: ApiImage[] }) => {
        const mapped: GalleryImage[] = (data.images ?? []).map((i) => ({
          src: i.url,
          alt: i.alt || i.caption || "Housey",
          category: (i.categories.length > 0 ? i.categories : ["aerial"]) as Category[],
          featured: i.featured,
        }));
        setUploadedImages(mapped);
      })
      .catch(() => undefined);
  }, []);

  const allImages = [...images, ...uploadedImages];
  const filteredImages =
    activeCategory === "all"
      ? allImages
      : allImages.filter((img) => img.category.includes(activeCategory));

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
          Explore our Dalmatian coast hideaway — from azure waters and stone terraces to cozy interiors.
        </p>
      </div>

      <div className="container mb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {(["all", "aerial", "coast", "exterior", "terrace", "interior"] as Category[]).map((cat) => (
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
                ({cat === "all" ? allImages.length : allImages.filter((img) => img.category.includes(cat)).length})
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

        {filteredImages.length === 0 && (
          <div className="text-center py-20 text-slate-500">No images in this category.</div>
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
