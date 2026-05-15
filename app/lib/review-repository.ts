// KV-backed review repository (Upstash Redis on Vercel; falls back to a
// file-backed implementation in local dev). Mirrors the image repository
// pattern: one Redis key per review + a SET index of all IDs.

import { Redis } from '@upstash/redis';
import type { Review } from './reviews';
import { isReview } from './reviews';

export interface ReviewRepository {
  list(): Promise<Review[]>;
  get(id: string): Promise<Review | null>;
  create(input: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;
  patch(id: string, patch: Partial<Omit<Review, 'id' | 'createdAt'>>): Promise<Review | null>;
  delete(id: string): Promise<Review | null>;
}

// ── KV implementation ────────────────────────────────────────────────────────
const REVIEW_KEY = (id: string) => `review:${id}`;
const REVIEWS_INDEX = 'reviews:index';

let redisInstance: Redis | null = null;
function redis(): Redis {
  if (redisInstance) return redisInstance;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV not configured');
  redisInstance = new Redis({ url, token });
  return redisInstance;
}

function safeParse(s: unknown): unknown {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return null; }
}

export const kvReviewRepository: ReviewRepository = {
  async list() {
    const r = redis();
    const ids = (await r.smembers(REVIEWS_INDEX)) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const blobs = (await r.mget<unknown[]>(...ids.map(REVIEW_KEY))) ?? [];
    const out: Review[] = [];
    for (const b of blobs) {
      const parsed = typeof b === 'string' ? safeParse(b) : b;
      if (isReview(parsed)) out.push(parsed as Review);
    }
    out.sort((a, b) => a.sortOrder - b.sortOrder || b.date.localeCompare(a.date));
    return out;
  },
  async get(id) {
    const r = redis();
    const raw = await r.get<unknown>(REVIEW_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    return isReview(parsed) ? (parsed as Review) : null;
  },
  async create(input) {
    const r = redis();
    const review: Review = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await r.set(REVIEW_KEY(review.id), JSON.stringify(review));
    await r.sadd(REVIEWS_INDEX, review.id);
    return review;
  },
  async patch(id, patch) {
    const r = redis();
    const raw = await r.get<unknown>(REVIEW_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isReview(parsed)) return null;
    const merged: Review = { ...(parsed as Review), ...patch };
    await r.set(REVIEW_KEY(id), JSON.stringify(merged));
    return merged;
  },
  async delete(id) {
    const r = redis();
    const raw = await r.get<unknown>(REVIEW_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isReview(parsed)) return null;
    await r.srem(REVIEWS_INDEX, id);
    await r.del(REVIEW_KEY(id));
    return parsed as Review;
  },
};

// ── File implementation (local dev fallback) ─────────────────────────────────
import { JsonStore } from './data-store';

const reviewsFileStore = new JsonStore<Review[]>({
  filename: 'reviews.json',
  defaultValue: [],
  validate: (raw): Review[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(isReview);
  },
});

export const fileReviewRepository: ReviewRepository = {
  async list() {
    const all = await reviewsFileStore.read();
    return [...all].sort((a, b) => a.sortOrder - b.sortOrder || b.date.localeCompare(a.date));
  },
  async get(id) {
    const all = await reviewsFileStore.read();
    return all.find((r) => r.id === id) ?? null;
  },
  async create(input) {
    const review: Review = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await reviewsFileStore.update((current) => ({ next: [...current, review] }));
    return review;
  },
  async patch(id, patch) {
    let result: Review | null = null;
    await reviewsFileStore.update((current) => {
      const idx = current.findIndex((r) => r.id === id);
      if (idx === -1) return { next: current };
      const merged: Review = { ...current[idx], ...patch };
      result = merged;
      const next = [...current];
      next[idx] = merged;
      return { next };
    });
    return result;
  },
  async delete(id) {
    let removed: Review | null = null;
    await reviewsFileStore.update((current) => {
      const idx = current.findIndex((r) => r.id === id);
      if (idx === -1) return { next: current };
      removed = current[idx];
      return { next: current.filter((_, i) => i !== idx) };
    });
    return removed;
  },
};
