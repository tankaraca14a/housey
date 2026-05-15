// Server component: fetches the top 3 featured reviews and renders a
// 3-column strip. Embedded on the home page. Renders nothing if there
// are no featured reviews yet (graceful empty state).

import Link from 'next/link';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { ReviewCard } from './ReviewCard';

export async function FeaturedReviewsStrip() {
  let list: Awaited<ReturnType<typeof reviewsRepo.list>> = [];
  try {
    list = (await reviewsRepo.list()).filter((r) => r.featured).slice(0, 3);
  } catch (e) {
    console.error('FeaturedReviewsStrip load failed:', e);
  }
  if (list.length === 0) return null;

  return (
    <section className="container py-16 border-t border-white/5">
      <div className="text-center mb-10">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-3">From past guests</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white">What guests say</h2>
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
          Read all reviews →
        </Link>
      </div>
    </section>
  );
}
