"use client";

// Renders the /reviews page chrome: localised headings, eyebrow,
// description, empty-state, and the two card grids. Cards are still
// passed-through to ReviewCard (also client) which translates its
// "Read on {source} →" link.
//
// The list is hydrated from server props so the initial SSR HTML
// contains the rendered cards — integration tests that inspect raw
// fetched HTML keep working.

import type { Review } from '@/app/lib/reviews';
import { ReviewCard } from './ReviewCard';
import { useT } from '@/app/components/LangProvider';

export function ReviewsPageContent({ initialList }: { initialList: Review[] }) {
  const t = useT();
  const featured = initialList.filter((r) => r.featured);
  const regular = initialList.filter((r) => !r.featured);

  return (
    <div className="min-h-screen bg-surface-900">
      <div className="container pt-16 pb-10 text-center">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-4">{t('reviews.eyebrow')}</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          {t('reviews.title')}
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          {t('reviews.description')}
        </p>
      </div>

      {initialList.length === 0 ? (
        <div className="container pb-24 text-center text-slate-500">
          <p>{t('reviews.emptyState')}</p>
        </div>
      ) : (
        <div className="container pb-24 space-y-12">
          {featured.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {featured.map((r) => (
                <ReviewCard key={r.id} review={r} featured />
              ))}
            </div>
          )}
          {regular.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {regular.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
