"use client";

// One review tile: stars + quote + author + source + optional link.
// Used on the /reviews page and the homepage featured strip. Client
// component so the "Read on {source} →" label flips with the picker.

import { useState } from 'react';
import type { Review } from '@/app/lib/reviews';
import { ReviewStars } from './ReviewStars';
import { useLang, useT } from '@/app/components/LangProvider';
import type { PublicStrings } from '@/app/lib/i18n/public';

interface Props {
  review: Review;
  featured?: boolean;  // bigger styling when true
}

export function ReviewCard({ review, featured = false }: Props) {
  const t = useT();
  const { lang: visitorLang } = useLang();
  const sizeClass = featured ? 'p-8' : 'p-6';
  const quoteSize = featured ? 'text-lg md:text-xl' : 'text-base';

  // Translation precedence:
  //   1. If review.translations[visitorLang] exists → show that, with a
  //      "Show original" toggle that reverts to the source quote.
  //   2. Otherwise show the original quote in review.quote.
  // The "in {language}" badge is shown when the *displayed* quote is in
  // a language other than the visitor's current one — i.e., when we're
  // showing the original because no translation was available, or when
  // the visitor explicitly clicked "Show original".
  const hasTranslation = !!review.translations?.[visitorLang];
  const [showingOriginal, setShowingOriginal] = useState(false);
  const showTranslation = hasTranslation && !showingOriginal;
  const displayedQuote = showTranslation
    ? (review.translations![visitorLang] as string)
    : review.quote;
  const displayedLang = showTranslation ? visitorLang : review.lang;
  const showLangBadge = displayedLang && displayedLang !== visitorLang;
  const langBadgeText = showLangBadge
    ? t('reviews.inLanguage').replace(
        '{language}',
        t(`lang.${displayedLang}` as keyof PublicStrings),
      )
    : null;
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
        &ldquo;{displayedQuote}&rdquo;
      </blockquote>
      {hasTranslation && (
        <button
          type="button"
          onClick={() => setShowingOriginal((v) => !v)}
          data-testid={`review-translation-toggle-${review.id}`}
          className="self-start text-xs text-brand-400 hover:text-brand-300 underline-offset-2 hover:underline"
        >
          {showingOriginal ? t('reviews.showTranslation') : t('reviews.showOriginal')}
        </button>
      )}
      <div className="mt-auto pt-3 border-t border-white/5 flex items-baseline justify-between text-sm">
        <div>
          <span dir="auto" className="text-white font-semibold">{review.author}</span>
          <span className="text-slate-400"> · {review.source}</span>
          {langBadgeText && (
            <span
              data-testid={`review-lang-badge-${review.id}`}
              className="text-slate-500 text-xs ml-2 italic"
            >
              · {langBadgeText}
            </span>
          )}
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
