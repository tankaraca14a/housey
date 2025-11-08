import Image from "next/image";

export default function LocationPage() {
  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Location</h1>
          <p className="text-slate-300 text-lg">Discover the beauty of the Dalmatian coast</p>
        </div>

        <div className="relative h-[400px] rounded-2xl overflow-hidden mb-12">
          <Image
            src="/images/WhatsApp Image 2025-11-07 at 00.06.25.jpeg"
            alt="Aerial view of location"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-8">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">Getting Here</h2>
            <div className="mb-6 p-4 bg-brand-500/10 border border-brand-400/30 rounded-xl">
              <h3 className="text-brand-400 font-semibold mb-2">Property Address</h3>
              <p className="text-white text-lg">Tankaraca 14a</p>
              <p className="text-white text-lg">Vela Luka, Korčula</p>
              <p className="text-white text-lg">Croatia</p>
              <div className="mt-4 pt-4 border-t border-brand-400/20">
                <p className="text-slate-300 mb-2"><strong>GPS Coordinates:</strong></p>
                <p className="text-white font-mono">42.9604° N, 16.7147° E</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Tankaraca+14a+Vela+Luka+Korcula+Croatia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition"
                >
                  📍 Open in Google Maps
                </a>
              </div>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              Our house is located in Vela Luka on the beautiful island of Korčula, one of Croatia&apos;s
              most stunning Adriatic islands. The property is easily accessible from major Croatian
              cities and airports.
            </p>
            <div className="space-y-3 text-slate-300">
              <p>✈️ <strong>Nearest Airport:</strong> Split Airport (approx. 2 hours drive + ferry)</p>
              <p>⛴️ <strong>By Ferry:</strong> Regular ferry from Split to Vela Luka (2.5-3 hours)</p>
              <p>🚗 <strong>By Car:</strong> Private parking available on-site</p>
              <p>🚢 <strong>From Dubrovnik:</strong> Ferry connections also available</p>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">Nearby Attractions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-brand-400 mb-3">Nature & Beaches</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• Pristine beaches (walking distance)</li>
                  <li>• Crystal-clear swimming spots</li>
                  <li>• Hiking trails with sea views</li>
                  <li>• Snorkeling and diving spots</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-brand-400 mb-3">Local Amenities</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• Traditional Dalmatian restaurants</li>
                  <li>• Local markets and shops</li>
                  <li>• Historic towns and villages</li>
                  <li>• Water sports and boat rentals</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">Map</h2>
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
              Click on the map to open in Google Maps for directions
            </p>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold text-white mb-4">About Vela Luka & Korčula</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Vela Luka is a charming town on the western end of Korčula island, known for its
              beautiful bay, crystal-clear waters, and authentic Mediterranean atmosphere. The island
              of Korčula is famous for its stunning sunsets, fresh seafood, and warm climate.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Summer months (June-September) are perfect for swimming and water activities, while
              spring and autumn offer milder weather ideal for exploring. The town offers numerous
              restaurants, cafes, and local markets where you can experience authentic Dalmatian culture.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              Don&apos;t miss visiting the famous Korčula Old Town, local wineries, and nearby islands.
              The area is perfect for sailing, diving, and enjoying the Mediterranean lifestyle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
