"use client";

import Image from "next/image";
import { useState } from "react";

type Category = "all" | "views" | "exterior" | "interior";

interface GalleryImage {
  src: string;
  alt: string;
  category: Category[];
  featured?: boolean;
}

const images: GalleryImage[] = [
  // Sea views & exterior — existing images with blue/sea dominant colors
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg",
    alt: "Aerial view of the property and coastline",
    category: ["views", "exterior"],
    featured: true,
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (1).jpeg",
    alt: "Panoramic sea view from the terrace",
    category: ["views"],
    featured: true,
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.26.jpeg",
    alt: "Crystal clear Adriatic waters",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (2).jpeg",
    alt: "Sea view from the property",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27.jpeg",
    alt: "Dalmatian coastline view",
    category: ["views", "exterior"],
    featured: true,
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (1).jpeg",
    alt: "Sunset over the Adriatic",
    category: ["views"],
    featured: true,
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (2).jpeg",
    alt: "Turquoise sea waters",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (3).jpeg",
    alt: "View from the property",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (4).jpeg",
    alt: "Scenic coastal view",
    category: ["views", "exterior"],
    featured: true,
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (2).jpeg",
    alt: "Adriatic sea panorama",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (3).jpeg",
    alt: "Sea view from the terrace",
    category: ["views"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (4).jpeg",
    alt: "Coastal landscape",
    category: ["views", "exterior"],
  },
  // Outdoor/exterior/terrace — existing greenish images
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.26 (3).jpeg",
    alt: "Outdoor terrace area",
    category: ["exterior"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.27 (5).jpeg",
    alt: "Garden and surroundings",
    category: ["exterior"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.28 (1).jpeg",
    alt: "Outdoor seating area",
    category: ["exterior"],
  },
  {
    src: "/images/WhatsApp Image 2025-11-07 at 00.06.28.jpeg",
    alt: "Property exterior",
    category: ["exterior"],
    featured: true,
  },
  // Interior — new images (March 2026)
  {
    src: "/images/new/interior-01.jpg",
    alt: "Bright interior room with sea-view window",
    category: ["interior"],
    featured: true,
  },
  {
    src: "/images/new/interior-02.jpg",
    alt: "Cosy bedroom interior",
    category: ["interior"],
  },
  {
    src: "/images/new/interior-03.jpg",
    alt: "Interior living space",
    category: ["interior"],
  },
  {
    src: "/images/new/interior-04.jpg",
    alt: "Interior with window light",
    category: ["interior"],
    featured: true,
  },
  {
    src: "/images/new/interior-05.jpg",
    alt: "Bright interior room",
    category: ["interior"],
  },
  {
    src: "/images/new/interior-06.jpg",
    alt: "Interior overview",
    category: ["interior"],
  },
];

const categoryLabels: Record<Category, string> = {
  all: "All Photos",
  views: "Sea Views",
  exterior: "Exterior & Terrace",
  interior: "Interior",
};

const categoryIcons: Record<Category, string> = {
  all: "🏡",
  views: "🌊",
  exterior: "☀️",
  interior: "🛋️",
};

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredImages =
    activeCategory === "all"
      ? images
      : images.filter((img) => img.category.includes(activeCategory));

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const lightboxPrev = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredImages.length) % filteredImages.length);
  };

  const lightboxNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredImages.length);
  };

  const featuredImages = filteredImages.filter((img) => img.featured);
  const regularImages = filteredImages.filter((img) => !img.featured);

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <div className="container pt-16 pb-10 text-center">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-4">
          Vela Luka, Korčula
        </p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          Gallery
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Explore our Dalmatian coast property — sea views, sun-drenched terraces, and cosy interiors.
        </p>
      </div>

      {/* Category Filter */}
      <div className="container mb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {(["all", "views", "exterior", "interior"] as Category[]).map((cat) => (
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
                (
                {cat === "all"
                  ? images.length
                  : images.filter((img) => img.category.includes(cat)).length}
                )
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="container pb-24">
        {/* Featured / Hero Grid */}
        {featuredImages.length > 0 && (
          <div className="mb-4">
            {featuredImages.length === 1 ? (
              <button
                onClick={() => openLightbox(filteredImages.indexOf(featuredImages[0]))}
                className="relative w-full h-[55vh] rounded-2xl overflow-hidden group block"
              >
                <Image
                  src={featuredImages[0].src}
                  alt={featuredImages[0].alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-4xl">⊕</span>
                </div>
              </button>
            ) : featuredImages.length === 2 ? (
              <div className="grid grid-cols-2 gap-4 h-[55vh]">
                {featuredImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => openLightbox(filteredImages.indexOf(img))}
                    className="relative rounded-2xl overflow-hidden group"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority={i === 0}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 grid-rows-2 gap-4" style={{ height: "65vh" }}>
                {/* Large main image */}
                <button
                  onClick={() => openLightbox(filteredImages.indexOf(featuredImages[0]))}
                  className="relative col-span-2 row-span-2 rounded-2xl overflow-hidden group"
                >
                  <Image
                    src={featuredImages[0].src}
                    alt={featuredImages[0].alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
                {/* Side images */}
                {featuredImages.slice(1, 3).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => openLightbox(filteredImages.indexOf(img))}
                    className="relative rounded-2xl overflow-hidden group"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {i === 1 && featuredImages.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xl font-semibold">
                          +{featuredImages.length - 3} more
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regular Masonry Grid */}
        {regularImages.length > 0 && (
          <div className="mt-4 columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {regularImages.map((img, i) => {
              const globalIndex = filteredImages.indexOf(img);
              return (
                <button
                  key={i}
                  onClick={() => openLightbox(globalIndex)}
                  className="relative w-full overflow-hidden rounded-xl group break-inside-avoid block"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              );
            })}
          </div>
        )}

        {filteredImages.length === 0 && (
          <div className="text-center py-20 text-slate-500">No images in this category.</div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/96 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] mx-auto px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={filteredImages[lightboxIndex].src}
              alt={filteredImages[lightboxIndex].alt}
              fill
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white px-6 py-2 rounded-full text-sm">
            {filteredImages[lightboxIndex].alt} &nbsp;·&nbsp;{" "}
            {lightboxIndex + 1} / {filteredImages.length}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              lightboxPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white w-12 h-12 rounded-full flex items-center justify-center transition text-xl"
            aria-label="Previous"
          >
            ←
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              lightboxNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white w-12 h-12 rounded-full flex items-center justify-center transition text-xl"
            aria-label="Next"
          >
            →
          </button>

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white w-10 h-10 rounded-full flex items-center justify-center transition text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
