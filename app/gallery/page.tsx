"use client";

import Image from "next/image";
import { useState } from "react";

const images = [
  "/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.26.jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.26 (1).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.26 (2).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.26 (3).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27.jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27 (1).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27 (2).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27 (3).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27 (4).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.27 (5).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.28.jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.28 (1).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.28 (2).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.28 (3).jpeg",
  "/images/WhatsApp Image 2025-11-07 at 00.06.28 (4).jpeg",
];

export default function GalleryPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length);
    } else {
      setCurrentIndex((currentIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length);
    } else {
      setCurrentIndex((currentIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="container py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Gallery</h1>
        <p className="text-slate-300 text-lg">Explore the beauty of our Dalmatian coast property</p>
      </div>

      {/* Main Carousel */}
      <div className="relative mb-16">
        <div className="relative h-[60vh] rounded-2xl overflow-hidden">
          <Image
            src={images[currentIndex]}
            alt={`Gallery image ${currentIndex + 1}`}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Carousel Controls */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition"
        >
          ←
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full transition"
        >
          →
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`relative h-48 rounded-xl overflow-hidden transition ${
              currentIndex === index ? "ring-4 ring-brand-400" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={images[selectedImage]}
              alt={`Lightbox image ${selectedImage + 1}`}
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition"
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition"
          >
            →
          </button>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
