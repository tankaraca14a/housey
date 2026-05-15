import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import SocialLinks from "./components/SocialLinks";
import { LangProvider } from "./components/LangProvider";
import { LangPicker } from "./components/LangPicker";

// Open Graph / Twitter card metadata. The image is one of the existing
// gallery photos. When socials are configured in env vars they show up in
// link previews on FB/IG/iMessage as well.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.tankaraca.com";
const OG_IMAGE = "/images/WhatsApp Image 2025-11-07 at 00.06.27.jpeg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Housey — Dalmatian Coast Vacation Rental",
  description:
    "Beautiful house rental on the Dalmatian coast, surrounded by the sea.",
  openGraph: {
    title: "Housey — Dalmatian Coast Vacation Rental",
    description:
      "Beautiful stone house in Vela Luka, Korčula — crystal-clear sea, private terrace, secluded.",
    url: SITE_URL,
    siteName: "Housey",
    locale: "en_US",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Housey, Vela Luka — aerial coast view" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Housey — Dalmatian Coast Vacation Rental",
    description:
      "Beautiful stone house in Vela Luka, Korčula — crystal-clear sea, private terrace, secluded.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <LangProvider>
        <header className="border-b border-white/10 bg-surface-900/80 backdrop-blur">
          <nav className="container flex items-center justify-between h-16 text-sm">
            <Link href="/" className="font-semibold text-brand-400 tracking-wide">Housey</Link>
            {/* Mobile: hide the 5-link nav so the page doesn't overflow horizontally
                at narrow widths. The footer carries the same destinations. Tablet
                and up (sm:flex, ≥640px): show inline. */}
            <ul className="hidden sm:flex gap-6 text-sm text-slate-200">
              <li><Link href="/about" className="hover:text-brand-300 transition-colors">About</Link></li>
              <li><Link href="/gallery" className="hover:text-brand-300 transition-colors">Gallery</Link></li>
              <li><Link href="/location" className="hover:text-brand-300 transition-colors">Location</Link></li>
              <li><Link href="/booking" className="hover:text-brand-300 transition-colors">Booking</Link></li>
              <li><Link href="/reviews" className="hover:text-brand-300 transition-colors">Reviews</Link></li>
              <li><Link href="/contact" className="hover:text-brand-300 transition-colors">Contact</Link></li>
            </ul>
            <div className="flex items-center gap-3">
              <LangPicker />
              {/* Mobile fallback: a single compact button linking to the gallery (the
                  most likely destination for a guest landing on the home page). The
                  full site map is in the footer. */}
              <Link
                href="/gallery"
                className="sm:hidden text-xs px-3 py-1.5 rounded-lg bg-surface-700 text-slate-200 hover:bg-surface-600 transition border border-white/10"
              >
                Menu
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
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
              <p>© {new Date().getFullYear()} Housey. All rights reserved.</p>
              <p className="text-slate-400">Built by Mihaela MJ</p>
            </div>
          </div>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
