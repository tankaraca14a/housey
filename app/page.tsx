// Home page. Server component so:
//   * FeaturedReviewsStrip (server) can be a sibling and contribute its
//     SSR cards to the initial HTML (good for SEO + integration tests).
//   * The page-level dynamic = 'force-dynamic' actually works (only valid
//     on server components).
// Translatable hero/features content lives in <HomeContent /> which is a
// client component reading from the LangProvider context.

import { FeaturedReviewsStrip } from "@/app/components/FeaturedReviewsStrip";
import { HomeContent } from "@/app/components/HomeContent";

// Force a fresh render on every request so the FeaturedReviewsStrip
// reflects the latest owner edits (un-feature, rating change, delete)
// the moment the admin saves.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <HomeContent />
      <FeaturedReviewsStrip />
    </>
  );
}
