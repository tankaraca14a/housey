// Social-link icons. URLs come from public env vars at build time:
//   NEXT_PUBLIC_INSTAGRAM_URL — full https://instagram.com/<handle>
//   NEXT_PUBLIC_FACEBOOK_URL  — full https://facebook.com/<page>
//
// Both are optional. When either is unset, that icon is omitted from the
// render — no broken hrefs, no placeholder warnings. When both are unset,
// the component returns null and the parent's surrounding layout
// (gap, padding) collapses cleanly.
//
// To add or change URLs WITHOUT a code change: set the env var in the
// Vercel project settings (Production scope), redeploy. The build picks
// it up automatically.

interface SocialLinksProps {
  // Visual style: "footer" = small monochrome icons, "contact" = bigger
  // pill buttons with text labels.
  variant?: 'footer' | 'contact';
  className?: string;
}

// Read env at render time (not module load) so unit tests can inject values
// before invocation. Exported for direct testing.
export function readSocialUrls() {
  return {
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() ?? '',
    facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() ?? '',
  };
}

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function SocialLinks({ variant = 'footer', className = '' }: SocialLinksProps) {
  const { instagramUrl, facebookUrl } = readSocialUrls();
  if (!instagramUrl && !facebookUrl) return null;

  if (variant === 'contact') {
    return (
      <div className={`flex flex-wrap gap-3 ${className}`} data-testid="social-links-contact">
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="social-link-instagram"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-white/10 text-slate-200 hover:text-brand-300 transition"
          >
            <InstagramIcon />
            <span className="text-sm font-medium">Instagram</span>
          </a>
        )}
        {facebookUrl && (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="social-link-facebook"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-white/10 text-slate-200 hover:text-brand-300 transition"
          >
            <FacebookIcon />
            <span className="text-sm font-medium">Facebook</span>
          </a>
        )}
      </div>
    );
  }

  // footer variant
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="social-links-footer">
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          data-testid="social-link-instagram"
          className="text-slate-400 hover:text-brand-400 transition"
        >
          <InstagramIcon />
        </a>
      )}
      {facebookUrl && (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          data-testid="social-link-facebook"
          className="text-slate-400 hover:text-brand-400 transition"
        >
          <FacebookIcon />
        </a>
      )}
    </div>
  );
}
