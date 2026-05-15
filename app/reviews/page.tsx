// The full /reviews page. Lists every review the owner has published.
// Featured ones get bigger cards at the top; the rest below in a regular
// grid. Empty state shows a friendly message instead of an empty page.

import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { ReviewCard } from '@/app/components/ReviewCard';

// Always render fresh: admin mutations (PATCH featured/rating, POST, DELETE)
// must show on the public page within the next request, not after the next
// deploy or a Next.js cache revalidate window. Without this, dev-mode and
// prod-mode disagree on whether a flipped `featured` flag drops the row off
// the home page strip — see test/integration/reviews-public-render.mjs.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reviews — Housey',
  description: 'What past guests say about staying at Housey, Vela Luka.',
};

export default async function ReviewsPage() {
  let list: Awaited<ReturnType<typeof reviewsRepo.list>> = [];
  try {
    list = await reviewsRepo.list();
  } catch (e) {
    console.error('ReviewsPage load failed:', e);
  }
  const featured = list.filter((r) => r.featured);
  const regular = list.filter((r) => !r.featured);

  return (
    <div className="min-h-screen bg-surface-900">
      <div className="container pt-16 pb-10 text-center">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-4">From past guests</p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          Reviews
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          What guests have said after staying at Housey, Vela Luka.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="container pb-24 text-center text-slate-500">
          <p>No reviews yet — check back soon.</p>
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
