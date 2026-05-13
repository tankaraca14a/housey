// Resilient JSON-file-backed data store.
//
// Why this exists:
//   The app persists data in two JSON files (data/bookings.json,
//   data/blocked-dates.json) and the API routes do read-modify-write on
//   every mutation. Naive `fs.writeFile` has two problems:
//
//     1. Non-atomic. A crash or kill -9 mid-write leaves a truncated or
//        zero-byte file. We lose ALL data, not just the latest write.
//     2. No concurrency. Two requests hitting the same endpoint at the
//        same time both read the same baseline, mutate, and write — the
//        second write clobbers the first ("lost update").
//
// This module fixes both:
//
//   - Atomic write via `fs.writeFile(tmp) + fs.rename(tmp, real)`. POSIX
//     rename within the same directory is atomic, so either the new file
//     is there in full or the old one is — never a half-written file.
//   - In-process per-file mutex. The Next.js dev server and most VM-style
//     deploys run as a single Node process, so an in-process mutex
//     serializes the read-modify-write inside `updateAtomic`. Multiple
//     processes (serverless) can still race, but: (a) that's a separate
//     problem inherent to JSON-on-disk on serverless, (b) the atomic
//     rename still prevents partial files.
//   - Schema validation on read. If the file is missing or contains
//     invalid JSON, we return the default state and log loudly — the API
//     keeps working with an empty list instead of throwing 500.
//
// Reading is non-locking (returns a defensive copy). Only mutations
// serialize through the mutex.

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

class AsyncMutex {
  private chain: Promise<void> = Promise.resolve();
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const mutexes = new Map<string, AsyncMutex>();
function mutexFor(file: string): AsyncMutex {
  let m = mutexes.get(file);
  if (!m) {
    m = new AsyncMutex();
    mutexes.set(file, m);
  }
  return m;
}

async function atomicWrite(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(tmp, content, 'utf-8');
    await fs.rename(tmp, file);
  } catch (err) {
    // best-effort cleanup of the orphan tmp file
    fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

interface StoreOptions<T> {
  filename: string;
  defaultValue: T;
  validate: (raw: unknown) => T;
}

export class JsonStore<T> {
  readonly file: string;
  private readonly defaultValue: T;
  private readonly validate: (raw: unknown) => T;

  constructor(opts: StoreOptions<T>) {
    this.file = path.join(DATA_DIR, opts.filename);
    this.defaultValue = opts.defaultValue;
    this.validate = opts.validate;
  }

  /** Read the current state. Returns a defensive deep copy. Never throws —
   * missing/corrupt files yield the default value (logged). */
  async read(): Promise<T> {
    try {
      const raw = await fs.readFile(this.file, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.validate(parsed);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        console.warn(`[data-store] ${this.file} unreadable (${code ?? err}); using default`);
      }
      // Defensive copy of the default value
      return JSON.parse(JSON.stringify(this.defaultValue)) as T;
    }
  }

  /** Overwrite the state atomically. Serialized per-file. */
  async write(next: T): Promise<void> {
    await mutexFor(this.file).run(async () => {
      await atomicWrite(this.file, JSON.stringify(next, null, 2));
    });
  }

  /** Read-modify-write under a per-file mutex. The mutator MUST return the
   * new state and must NOT mutate the input — this method passes a
   * defensive copy already. The whole transaction is atomic. */
  async update<R = void>(mutator: (current: T) => { next: T; result?: R } | Promise<{ next: T; result?: R }>): Promise<R | undefined> {
    return await mutexFor(this.file).run(async () => {
      const current = await this.readUnsafe();
      const { next, result } = await mutator(current);
      await atomicWrite(this.file, JSON.stringify(next, null, 2));
      return result;
    });
  }

  // Internal: read without copy, used inside the mutex. The caller (update)
  // owns the result and may mutate it.
  private async readUnsafe(): Promise<T> {
    try {
      const raw = await fs.readFile(this.file, 'utf-8');
      const parsed = JSON.parse(raw);
      return this.validate(parsed);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        console.warn(`[data-store] ${this.file} unreadable inside update (${code ?? err}); starting from default`);
      }
      return JSON.parse(JSON.stringify(this.defaultValue)) as T;
    }
  }
}
