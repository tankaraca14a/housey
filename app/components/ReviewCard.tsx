"use client";

// One review tile: stars + quote + author + source + optional link.
// Used on the /reviews page and the homepage featured strip. Client
// component so the "Read on {source} →" label flips with the picker.

import type { Review } from '@/app/lib/reviews';
import { ReviewStars } from './ReviewStars';
import { useT } from '@/app/components/LangProvider';

interface Props {
  review: Review;
  featured?: boolean;  // bigger styling when true
}

export function ReviewCard({ review, featured = false }: Props) {
  const t = useT();
  const sizeClass = featured ? 'p-8' : 'p-6';
  const quoteSize = featured ? 'text-lg md:text-xl' : 'text-base';
  return (
    <div
      data-testid={`review-${review.id}`}
      className={`bg-surface-800 border border-white/10 rounded-2xl ${sizeClass} flex flex-col gap-3`}
    >
      <ReviewStars rating={review.rating} size={featured ? 'lg' : 'md'} />
      {/* dir="auto" lets the browser apply the Unicode bidi algorithm so an
          Arabic/Hebrew/Farsi quote flows right-to-left and the typographic
          quotes (“ ”) end up on the correct side. See test/integration/reviews-rtl.mjs. */}
      <blockquote dir="auto" className={`${quoteSize} text-slate-100 leading-relaxed italic`}>
        &ldquo;{review.quote}&rdquo;
      </blockquote>
      <div className="mt-auto pt-3 border-t border-white/5 flex items-baseline justify-between text-sm">
        <div>
          <span dir="auto" className="text-white font-semibold">{review.author}</span>
          <span className="text-slate-400"> · {review.source}</span>
        </div>
        <span className="text-slate-500 text-xs tabular-nums">{review.date}</span>
      </div>
      {review.url && (
        <a
          href={review.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-400 hover:text-brand-300 text-xs"
        >
          {t('reviews.readOnSource').replace('{source}', review.source)}
        </a>
      )}
    </div>
  );
}
