// Pick the right repository backend based on env vars. Reads env at module
// load time so the choice is stable for the lifetime of the process.

import { fileBookingsRepository, fileBlockedDatesRepository } from './file-repository';
import { kvBookingsRepository, kvBlockedDatesRepository } from './kv-repository';
import { fileImageRepository, kvImageRepository } from './image-repository';
import { fileReviewRepository, kvReviewRepository } from './review-repository';
import {
  fileSubmittedReviewRepository,
  kvSubmittedReviewRepository,
} from './submitted-review-repository';
import type { BookingsRepository, BlockedDatesRepository } from './repository';
import type { ImageRepository } from './image-repository';
import type { ReviewRepository } from './review-repository';
import type { SubmittedReviewRepository } from './submitted-review-repository';

function kvConfigured(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

export const STORAGE_BACKEND: 'kv' | 'file' = kvConfigured() ? 'kv' : 'file';

export const bookings: BookingsRepository = STORAGE_BACKEND === 'kv'
  ? kvBookingsRepository
  : fileBookingsRepository;

export const blockedDates: BlockedDatesRepository = STORAGE_BACKEND === 'kv'
  ? kvBlockedDatesRepository
  : fileBlockedDatesRepository;

export const images: ImageRepository = STORAGE_BACKEND === 'kv'
  ? kvImageRepository
  : fileImageRepository;

export const reviews: ReviewRepository = STORAGE_BACKEND === 'kv'
  ? kvReviewRepository
  : fileReviewRepository;

export const submittedReviews: SubmittedReviewRepository = STORAGE_BACKEND === 'kv'
  ? kvSubmittedReviewRepository
  : fileSubmittedReviewRepository;

// Visible in server logs once at startup so the operator can confirm
// which backend is active.
console.log(`[storage] backend = ${STORAGE_BACKEND}`);
