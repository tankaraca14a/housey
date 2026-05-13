// Image metadata model + validators + repository factory.
// Storage:
//   - Bytes live in Vercel Blob (public URL, served from Vercel's edge CDN).
//   - Metadata lives in Vercel KV (Redis), one hash per image + an index
//     SET of all IDs — same pattern as the booking repository.

const CATEGORIES = ['aerial', 'coast', 'exterior', 'terrace', 'interior'] as const;
export type Category = typeof CATEGORIES[number];

export interface Image {
  id: string;                 // uuid
  url: string;                // Blob public URL (the thing <Image src> consumes)
  blobPathname: string;       // for DELETE from Blob on row removal
  alt: string;                // accessibility caption / alt text
  categories: Category[];     // 0+ tags
  featured: boolean;          // shown in hero/featured sections
  sortOrder: number;          // integer; lower = first
  width: number;              // px, for <Image>'s intrinsic size
  height: number;             // px
  caption?: string;           // visible caption (optional)
  uploadedAt: string;         // ISO timestamp
}

export function isImage(x: unknown): x is Image {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.id === 'string' &&
    typeof i.url === 'string' &&
    typeof i.blobPathname === 'string' &&
    typeof i.alt === 'string' &&
    Array.isArray(i.categories) && (i.categories as unknown[]).every((c) => typeof c === 'string' && (CATEGORIES as readonly string[]).includes(c)) &&
    typeof i.featured === 'boolean' &&
    typeof i.sortOrder === 'number' &&
    typeof i.width === 'number' &&
    typeof i.height === 'number' &&
    (i.caption === undefined || typeof i.caption === 'string') &&
    typeof i.uploadedAt === 'string'
  );
}

export type ImageInput = Omit<Image, 'id' | 'uploadedAt'>;
export type ImagePatch = Partial<Omit<Image, 'id' | 'url' | 'blobPathname' | 'uploadedAt'>>;

export function validateImageInput(input: Partial<ImageInput>): string | null {
  if (!input.url || typeof input.url !== 'string' || !input.url.startsWith('http')) return 'url required';
  if (!input.blobPathname || typeof input.blobPathname !== 'string') return 'blobPathname required';
  if (typeof input.alt !== 'string') return 'alt must be a string';
  if (!Array.isArray(input.categories)) return 'categories must be an array';
  if (!input.categories.every((c) => (CATEGORIES as readonly string[]).includes(c))) {
    return `categories must be from: ${CATEGORIES.join('|')}`;
  }
  if (typeof input.featured !== 'boolean') return 'featured must be boolean';
  if (typeof input.sortOrder !== 'number') return 'sortOrder must be number';
  if (typeof input.width !== 'number' || input.width <= 0) return 'width must be positive number';
  if (typeof input.height !== 'number' || input.height <= 0) return 'height must be positive number';
  if (input.caption !== undefined && typeof input.caption !== 'string') return 'caption must be a string';
  return null;
}

export function validateImagePatch(patch: ImagePatch): string | null {
  if (patch.alt !== undefined && typeof patch.alt !== 'string') return 'alt must be a string';
  if (patch.categories !== undefined) {
    if (!Array.isArray(patch.categories)) return 'categories must be an array';
    if (!patch.categories.every((c) => (CATEGORIES as readonly string[]).includes(c))) {
      return `categories must be from: ${CATEGORIES.join('|')}`;
    }
  }
  if (patch.featured !== undefined && typeof patch.featured !== 'boolean') return 'featured must be boolean';
  if (patch.sortOrder !== undefined && typeof patch.sortOrder !== 'number') return 'sortOrder must be number';
  if (patch.caption !== undefined && typeof patch.caption !== 'string') return 'caption must be a string';
  if (patch.width !== undefined && (typeof patch.width !== 'number' || patch.width <= 0)) return 'width must be positive number';
  if (patch.height !== undefined && (typeof patch.height !== 'number' || patch.height <= 0)) return 'height must be positive number';
  return null;
}

export const ALLOWED_CATEGORIES = CATEGORIES;
