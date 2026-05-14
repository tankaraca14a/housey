// Audit log for blocked-dates changes. Append-only. Each entry records
// who did what and when so a later report tool can distinguish:
//   - the owner clicking dates in /admin (source: 'manual')
//   - the auto-block triggered when a booking is Confirmed (source:
//     'confirm', bookingId)
//   - test scripts (recognisable by their User-Agent: 'HeadlessChrome',
//     'Playwright', 'WebDriver', 'Selenium')
//
// Storage: same backend split as the rest of housey (KV in production,
// JSON file locally). Reads return the entire log; the report tool
// renders human-readable output. Writes are best-effort — a failure to
// append the audit entry never blocks the actual data mutation.

import { STORAGE_BACKEND } from './store-factory';
import { Redis } from '@upstash/redis';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

let redisInstance: Redis | null = null;
function redis(): Redis {
  if (redisInstance) return redisInstance;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV not configured');
  redisInstance = new Redis({ url, token });
  return redisInstance;
}

export type AuditAction = 'block' | 'unblock';
export type AuditSource = 'manual' | 'confirm' | 'unknown';

export interface AuditEntry {
  ts: string;            // ISO timestamp
  action: AuditAction;
  date: string;          // YYYY-MM-DD
  source: AuditSource;
  bookingId?: string;    // populated when source === 'confirm'
  ip?: string;
  ua?: string;
}

const FILE = join(process.cwd(), 'data', 'blocked-dates-audit.jsonl');
const KV_KEY = 'housey:blocked-dates-audit';

// Limit log size so KV doesn't grow unbounded. We keep the most recent
// 5000 entries — enough to cover years of normal admin activity.
const MAX_ENTRIES = 5000;

async function readFromKv(): Promise<AuditEntry[]> {
  const raw = await redis().get<AuditEntry[]>(KV_KEY);
  if (!raw) return [];
  return raw as AuditEntry[];
}

async function writeToKv(entries: AuditEntry[]): Promise<void> {
  await redis().set(KV_KEY, entries);
}

async function readFromFile(): Promise<AuditEntry[]> {
  if (!existsSync(FILE)) return [];
  const txt = await readFile(FILE, 'utf-8');
  const out: AuditEntry[] = [];
  for (const line of txt.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

async function writeToFile(entries: AuditEntry[]): Promise<void> {
  if (!existsSync(dirname(FILE))) await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

export async function listAudit(): Promise<AuditEntry[]> {
  try {
    return STORAGE_BACKEND === 'kv' ? await readFromKv() : await readFromFile();
  } catch (e) {
    console.error('audit read failed:', e);
    return [];
  }
}

export async function recordAudit(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const existing = await listAudit();
    const next = [...existing, ...entries].slice(-MAX_ENTRIES);
    if (STORAGE_BACKEND === 'kv') await writeToKv(next);
    else await writeToFile(next);
  } catch (e) {
    // Never block the data mutation just because the audit failed.
    console.error('audit write failed (skipping):', e);
  }
}
