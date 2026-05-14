// KV-backed image repository (Upstash Redis on Vercel; falls back to a
// file-backed implementation in local dev). Mirrors the bookings
// repository pattern: one Redis key per image + a SET index of all IDs.

import { Redis } from '@upstash/redis';
import type { Image } from './images';
import { isImage } from './images';

export interface ImageRepository {
  list(): Promise<Image[]>;
  get(id: string): Promise<Image | null>;
  create(input: Omit<Image, 'id' | 'uploadedAt'>): Promise<Image>;
  patch(id: string, patch: Partial<Omit<Image, 'id' | 'url' | 'blobPathname' | 'uploadedAt'>>): Promise<Image | null>;
  delete(id: string): Promise<Image | null>; // returns the deleted row so blob can be deleted by caller
}

// ── KV implementation ────────────────────────────────────────────────────────
const IMAGE_KEY = (id: string) => `image:${id}`;
const IMAGES_INDEX = 'images:index';

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

export const kvImageRepository: ImageRepository = {
  async list() {
    const r = redis();
    const ids = (await r.smembers(IMAGES_INDEX)) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const blobs = (await r.mget<unknown[]>(...ids.map(IMAGE_KEY))) ?? [];
    const out: Image[] = [];
    for (const b of blobs) {
      const parsed = typeof b === 'string' ? safeParse(b) : b;
      if (isImage(parsed)) out.push(parsed as Image);
    }
    out.sort((a, b) => a.sortOrder - b.sortOrder || a.uploadedAt.localeCompare(b.uploadedAt));
    return out;
  },
  async get(id) {
    const r = redis();
    const raw = await r.get<unknown>(IMAGE_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    return isImage(parsed) ? (parsed as Image) : null;
  },
  async create(input) {
    const r = redis();
    const image: Image = {
      ...input,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
    };
    await r.set(IMAGE_KEY(image.id), JSON.stringify(image));
    await r.sadd(IMAGES_INDEX, image.id);
    return image;
  },
  async patch(id, patch) {
    const r = redis();
    const raw = await r.get<unknown>(IMAGE_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isImage(parsed)) return null;
    const merged: Image = { ...(parsed as Image), ...patch };
    await r.set(IMAGE_KEY(id), JSON.stringify(merged));
    return merged;
  },
  async delete(id) {
    const r = redis();
    const raw = await r.get<unknown>(IMAGE_KEY(id));
    if (raw == null) return null;
    const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!isImage(parsed)) return null;
    await r.srem(IMAGES_INDEX, id);
    await r.del(IMAGE_KEY(id));
    return parsed as Image;
  },
};

// ── File implementation (local dev fallback) ─────────────────────────────────
// Stores all images in data/images.json. Uses JsonStore — atomic writes
// via tmp+rename AND a per-file mutex so concurrent create/patch/delete
// don't race (the stress test would otherwise lose updates).
import { JsonStore } from './data-store';

const imagesFileStore = new JsonStore<Image[]>({
  filename: 'images.json',
  defaultValue: [],
  validate: (raw): Image[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter(isImage);
  },
});

export const fileImageRepository: ImageRepository = {
  async list() {
    const all = await imagesFileStore.read();
    return [...all].sort((a, b) => a.sortOrder - b.sortOrder || a.uploadedAt.localeCompare(b.uploadedAt));
  },
  async get(id) {
    const all = await imagesFileStore.read();
    return all.find((i) => i.id === id) ?? null;
  },
  async create(input) {
    const image: Image = {
      ...input,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
    };
    await imagesFileStore.update((current) => ({ next: [...current, image] }));
    return image;
  },
  async patch(id, patch) {
    let result: Image | null = null;
    await imagesFileStore.update((current) => {
      const idx = current.findIndex((i) => i.id === id);
      if (idx === -1) return { next: current };
      const merged: Image = { ...current[idx], ...patch };
      result = merged;
      const next = [...current];
      next[idx] = merged;
      return { next };
    });
    return result;
  },
  async delete(id) {
    let removed: Image | null = null;
    await imagesFileStore.update((current) => {
      const idx = current.findIndex((i) => i.id === id);
      if (idx === -1) return { next: current };
      removed = current[idx];
      return { next: current.filter((_, i) => i !== idx) };
    });
    return removed;
  },
};
