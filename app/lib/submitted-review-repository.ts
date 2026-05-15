// Repository for the "translation inbox" — raw reviews Ivana submits
// that Mihaela hasn't yet translated/published. Mirrors the structure
// of review-repository.ts so the file/KV split + isShape guards behave
// identically. Two reasons to keep this separate from the live Review
// store:
//   1. Visibility — submitted entries must NEVER leak to the public
//      /reviews GET. Storing them in their own keyspace makes that
//      structural: there's no path to read them from the public API.
//   2. Lifecycle — once Mihaela publishes a submission it becomes a
//      regular Review and is deleted from this inbox. Keeping the two
//      stores separate makes the transition explicit.

import { Redis } from '@upstash/redis';
import type { SubmittedReview, SubmittedReviewInput } from './submitted-reviews';
import { isSubmittedReview } from './submitted-reviews';

export interface SubmittedReviewRepository {
  list(): Promise<SubmittedReview[]>;
  get(id: string): Promise<SubmittedReview | null>;
  create(input: SubmittedReviewInput): Promise<SubmittedReview>;
  delete(id: string): Promise<SubmittedReview | null>;
}

// ── KV implementation ───────────────────────────────────────────────────────
const SUBMITTED_KEY = (id: string) => `submitted_review:${id}`;
const SUBMITTED_INDEX = 'submitted_reviews:index';

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

export const kvSubmittedReviewRepository: SubmittedReviewRepository = {
  async list() {
    const r = redis();
    const ids = (await r.smembers(SUBMITTED_INDEX)) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const blobs = (await r.mget<unknown[]>(...ids.map(SUBMITTED_KEY))) ?? [];
    const out: SubmittedReview[] = [];
    for (const b of blobs) {
      const parsed = typeof b === 'string' ? safeParse(b) : b;
      if (isSubmittedReview(parsed)) out.push(parsed as SubmittedReview);
    }
    // Oldest first so Mihaela works through the queue chronologically.
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  },
  async get(id) {
    const r = redis();
    const raw = await r.get<unknown>(SUBMITTED_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    return isSubmittedReview(parsed) ? (parsed as SubmittedReview) : null;
  },
  async create(input) {
    const r = redis();
    const submission: SubmittedReview = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await r.set(SUBMITTED_KEY(submission.id), JSON.stringify(submission));
    await r.sadd(SUBMITTED_INDEX, submission.id);
    return submission;
  },
  async delete(id) {
    const r = redis();
    const raw = await r.get<unknown>(SUBMITTED_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isSubmittedReview(parsed)) return null;
    await r.srem(SUBMITTED_INDEX, id);
    await r.del(SUBMITTED_KEY(id));
    return parsed as SubmittedReview;
  },
};

// ── File implementation (local dev fallback) ────────────────────────────────
import { JsonStore } from './data-store';

const submittedFileStore = new JsonStore<SubmittedReview[]>({
  filename: 'submitted-reviews.json',
  defaultValue: [],
  validate: (raw): SubmittedReview[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(isSubmittedReview);
  },
});

export const fileSubmittedReviewRepository: SubmittedReviewRepository = {
  async list() {
    const all = await submittedFileStore.read();
    return [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async get(id) {
    const all = await submittedFileStore.read();
    return all.find((r) => r.id === id) ?? null;
  },
  async create(input) {
    const submission: SubmittedReview = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await submittedFileStore.update((current) => ({ next: [...current, submission] }));
    return submission;
  },
  async delete(id) {
    let removed: SubmittedReview | null = null;
    await submittedFileStore.update((current) => {
      const idx = current.findIndex((r) => r.id === id);
      if (idx === -1) return { next: current };
      removed = current[idx];
      return { next: current.filter((_, i) => i !== idx) };
    });
    return removed;
  },
};
