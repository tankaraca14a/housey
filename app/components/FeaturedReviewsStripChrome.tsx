"use client";

// Renders the localised headings + "Read all" link for the home page's
// featured reviews strip. The cards themselves are passed as props from
// the server-rendered parent (FeaturedReviewsStrip).

import Link from "next/link";
import type { Review } from "@/app/lib/reviews";
import { ReviewCard } from "./ReviewCard";
import { useT } from "@/app/components/LangProvider";

export function FeaturedReviewsStripChrome({ list }: { list: Review[] }) {
  const t = useT();
  return (
    <section className="container py-16 border-t border-white/5">
      <div className="text-center mb-10">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-3">{t("strip.eyebrow")}</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white">{t("strip.heading")}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {list.map((r) => (
          <ReviewCard key={r.id} review={r} featured />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/reviews"
          className="text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-2"
        >
          {t("strip.readAll")}
        </Link>
      </div>
    </section>
  );
}
