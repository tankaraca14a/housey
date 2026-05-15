import "./globals.css";
import type { Metadata } from "next";
import { LangProvider } from "./components/LangProvider";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { getServerLang } from "./lib/i18n/server";
import type { Lang } from "./lib/i18n/types";

// Open Graph / Twitter card metadata. The image is one of the existing
// gallery photos. When socials are configured in env vars they show up in
// link previews on FB/IG/iMessage as well.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.tankaraca.com";
const OG_IMAGE = "/images/WhatsApp Image 2025-11-07 at 00.06.27.jpeg";

// One block per supported language. generateMetadata() reads the cookie
// the LangProvider sets and picks the matching entry; defaults to EN
// when the cookie is missing or unrecognised.
const META: Record<
  Lang,
  { locale: string; title: string; description: string; ogDescription: string; ogAlt: string }
> = {
  en: {
    locale: "en_US",
    title: "Housey — Dalmatian Coast Vacation Rental",
    description: "Beautiful house rental on the Dalmatian coast, surrounded by the sea.",
    ogDescription: "Beautiful stone house in Vela Luka, Korčula — crystal-clear sea, private terrace, secluded.",
    ogAlt: "Housey, Vela Luka — aerial coast view",
  },
  hr: {
    locale: "hr_HR",
    title: "Housey — kuća za odmor na dalmatinskoj obali",
    description: "Prekrasna kuća za odmor na dalmatinskoj obali, okružena morem.",
    ogDescription: "Prekrasna kamena kuća u Veloj Luci, Korčula — kristalno čisto more, privatna terasa, mir.",
    ogAlt: "Housey, Vela Luka — pogled iz zraka",
  },
  de: {
    locale: "de_DE",
    title: "Housey — Ferienhaus an der dalmatinischen Küste",
    description: "Wunderschönes Ferienhaus an der dalmatinischen Küste, vom Meer umgeben.",
    ogDescription: "Wunderschönes Steinhaus in Vela Luka, Korčula — kristallklares Meer, private Terrasse, abgeschieden.",
    ogAlt: "Housey, Vela Luka — Luftaufnahme der Küste",
  },
  it: {
    locale: "it_IT",
    title: "Housey — casa vacanze sulla costa dalmata",
    description: "Splendida casa vacanze sulla costa dalmata, circondata dal mare.",
    ogDescription: "Splendida casa in pietra a Vela Luka, Korčula — mare cristallino, terrazza privata, appartata.",
    ogAlt: "Housey, Vela Luka — vista aerea della costa",
  },
  fr: {
    locale: "fr_FR",
    title: "Housey — maison de vacances sur la côte dalmate",
    description: "Magnifique maison de vacances sur la côte dalmate, entourée par la mer.",
    ogDescription: "Magnifique maison en pierre à Vela Luka, Korčula — mer cristalline, terrasse privée, isolée.",
    ogAlt: "Housey, Vela Luka — vue aérienne de la côte",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  const m = META[lang];
  return {
    metadataBase: new URL(SITE_URL),
    title: m.title,
    description: m.description,
    openGraph: {
      title: m.title,
      description: m.ogDescription,
      url: SITE_URL,
      siteName: "Housey",
      locale: m.locale,
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: m.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.ogDescription,
      images: [OG_IMAGE],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLang = await getServerLang();
  return (
    // <html lang> matches the rendered content so screen readers + assistive
    // tech announce the right language. Set from the cookie at request time.
    <html lang={initialLang}>
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <LangProvider initialLang={initialLang}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
