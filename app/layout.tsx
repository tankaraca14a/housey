import "./globals.css";
import type { Metadata } from "next";
import { LangProvider } from "./components/LangProvider";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";

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
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
