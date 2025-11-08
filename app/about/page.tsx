import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">About the House</h1>
          <p className="text-slate-300 text-lg">Your perfect getaway on the Dalmatian coast</p>
        </div>

        <div className="relative h-[400px] rounded-2xl overflow-hidden mb-12">
          <Image
            src="/images/WhatsApp Image 2025-11-07 at 00.06.28.jpeg"
            alt="House overview"
            fill
            className="object-cover"
          />
        </div>

        <div className="prose prose-invert max-w-none">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-4">Welcome to Paradise</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Nestled on a secluded peninsula on the Dalmatian coast, our house offers a unique retreat
              surrounded by crystal-clear azure waters on nearly all sides. This hidden gem provides the
              perfect escape from everyday life, combining the tranquility of nature with modern comforts.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-800 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Property Features</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• 3 bedrooms, sleeps up to 6 guests</li>
                <li>• 2 bathrooms with modern fixtures</li>
                <li>• Fully equipped kitchen</li>
                <li>• Spacious living area</li>
                <li>• Outdoor terrace with sea views</li>
                <li>• Private parking space</li>
              </ul>
            </div>

            <div className="bg-surface-800 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Amenities</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Air conditioning & heating</li>
                <li>• High-speed WiFi</li>
                <li>• Flat-screen TV</li>
                <li>• BBQ grill</li>
                <li>• Beach access</li>
                <li>• Linens and towels provided</li>
              </ul>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-4">The Location</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              The house is located in one of the most beautiful and peaceful areas of the Dalmatian coast.
              Surrounded by the sea on almost all sides, you'll wake up to breathtaking views and the
              soothing sound of waves.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              Despite the secluded feel, local amenities including restaurants, shops, and attractions
              are just a short drive away. The property offers the perfect balance of privacy and
              convenience.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/booking"
              className="inline-block px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition"
            >
              Book Your Stay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
