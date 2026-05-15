// The full /reviews page. Server component so the initial HTML emitted
// to crawlers and integration tests contains the review cards. Headings
// translate client-side via a small ReviewsPageChrome wrapper that
// consumes the LangProvider context. First-render is EN by design.

import type { Review } from '@/app/lib/reviews';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { ReviewsPageContent } from '@/app/components/ReviewsPageContent';

// Always render fresh: admin mutations (PATCH featured/rating, POST, DELETE)
// must show on the public page within the next request, not after the next
// deploy or a Next.js cache revalidate window. Without this, dev-mode and
// prod-mode disagree on whether a flipped `featured` flag drops the row off
// the home page strip — see test/integration/reviews-public-render.mjs.
export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  let list: Review[] = [];
  try {
    list = await reviewsRepo.list();
  } catch (e) {
    console.error('ReviewsPage load failed:', e);
  }
  return <ReviewsPageContent initialList={list} />;
}
