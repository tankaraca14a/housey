// Server component: fetches the top 3 featured reviews and passes them
// to a client wrapper for localised headings. Embedded on the home page.
// Renders nothing if there are no featured reviews yet (graceful empty
// state). Server-rendered so the initial HTML contains the cards —
// integration tests + SEO crawlers see them.

import type { Review } from '@/app/lib/reviews';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { FeaturedReviewsStripChrome } from './FeaturedReviewsStripChrome';

export async function FeaturedReviewsStrip() {
  let list: Review[] = [];
  try {
    list = (await reviewsRepo.list()).filter((r) => r.featured).slice(0, 3);
  } catch (e) {
    console.error('FeaturedReviewsStrip load failed:', e);
  }
  if (list.length === 0) return null;

  return <FeaturedReviewsStripChrome list={list} />;
}
