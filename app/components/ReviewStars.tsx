// Pure-CSS star rating widget. Five span characters; filled ones get the
// brand colour, the rest go transparent grey. No icon library needed.

interface Props {
  rating: 1 | 2 | 3 | 4 | 5;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function ReviewStars({ rating, size = 'md', className = '' }: Props) {
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      role="img"
      className={`inline-flex gap-0.5 ${SIZE_CLASS[size]} ${className}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i <= rating ? 'text-amber-400' : 'text-slate-600'}
        >
          ★
        </span>
      ))}
    </span>
  );
}
