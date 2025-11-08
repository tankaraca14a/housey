import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Housey — Dalmatian Coast Vacation Rental",
  description: "Beautiful house rental on the Dalmatian coast, surrounded by the sea.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b border-white/10 bg-surface-900/80 backdrop-blur">
          <nav className="container flex items-center justify-between h-16 text-sm">
            <Link href="/" className="font-semibold text-brand-400 tracking-wide">Housey</Link>
            <ul className="flex gap-6 text-sm text-slate-200">
              <li><Link href="/about" className="hover:text-brand-300 transition-colors">About</Link></li>
              <li><Link href="/gallery" className="hover:text-brand-300 transition-colors">Gallery</Link></li>
              <li><Link href="/location" className="hover:text-brand-300 transition-colors">Location</Link></li>
              <li><Link href="/booking" className="hover:text-brand-300 transition-colors">Booking</Link></li>
              <li><Link href="/contact" className="hover:text-brand-300 transition-colors">Contact</Link></li>
            </ul>
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
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between pt-4 border-t border-white/5">
              <p>© {new Date().getFullYear()} Housey. All rights reserved.</p>
              <p className="text-slate-400">Built by Mihaela MJ</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
