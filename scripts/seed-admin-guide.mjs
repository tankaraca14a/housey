// Resets data/bookings.json + data/images.json to a deterministic seed
// the screenshot generators (and ADMIN-GUIDE / ADMIN-HR) reference by
// hard-coded testid (guide-pending-1, guide-confirmed-1, guide-declined-1,
// guide-img-{1,2,3}).
//
// Run before re-generating screenshots:
//   node scripts/seed-admin-guide.mjs --lang=en   (default — English message text)
//   node scripts/seed-admin-guide.mjs --lang=hr   (Croatian message text)

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

const lang = process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1] ?? 'en';

const messages = lang === 'hr'
  ? {
      anna:   'Bok! Veselimo se proslavi godišnjice na vašem prekrasnom mjestu!',
      marco:  'Obiteljski godišnji odmor, jedva čekamo more!',
      tomas:  'Samo 3 noći, ako može.',
    }
  : {
      anna:   "Hi! We're really looking forward to celebrating our anniversary at your beautiful place!",
      marco:  "Family summer holiday, can't wait for the sea!",
      tomas:  'Could we do just 3 nights?',
    };

const bookings = [
  {
    id: 'guide-pending-1',
    name: 'Anna Schmidt',
    email: 'anna.schmidt@example.invalid',
    phone: '+49 30 1234 5678',
    checkIn: '2026-06-10',
    checkOut: '2026-06-17',
    guests: '2',
    message: messages.anna,
    status: 'pending',
    createdAt: '2026-05-13T10:30:00.000Z',
  },
  {
    id: 'guide-confirmed-1',
    name: 'Marco Rossi',
    email: 'marco.rossi@example.invalid',
    phone: '+39 06 9876 5432',
    checkIn: '2026-07-20',
    checkOut: '2026-07-27',
    guests: '4',
    message: messages.marco,
    status: 'confirmed',
    createdAt: '2026-05-10T14:00:00.000Z',
  },
  {
    id: 'guide-declined-1',
    name: 'Tomás Garcia',
    email: 'tomas.garcia@example.invalid',
    phone: '+34 91 555 0199',
    checkIn: '2026-08-05',
    checkOut: '2026-08-08',
    guests: '2',
    message: messages.tomas,
    status: 'declined',
    createdAt: '2026-05-12T09:15:00.000Z',
  },
];

const images = [
  {
    id: 'guide-img-1',
    url: '/images/new/interior-01.jpg',
    blobPathname: 'seed/guide-img-1.jpg',
    alt: 'Sea & coast — featured cover',
    categories: ['coast'],
    featured: true,
    sortOrder: 1,
    width: 1600,
    height: 1067,
    uploadedAt: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'guide-img-2',
    url: '/images/new/interior-02.jpg',
    blobPathname: 'seed/guide-img-2.jpg',
    alt: 'Clear water with distant hills',
    categories: ['coast'],
    featured: false,
    sortOrder: 2,
    width: 1600,
    height: 1067,
    uploadedAt: '2026-05-01T08:01:00.000Z',
  },
  {
    id: 'guide-img-3',
    url: '/images/new/interior-03.jpg',
    blobPathname: 'seed/guide-img-3.jpg',
    alt: 'Rocky shoreline',
    categories: ['coast'],
    featured: false,
    sortOrder: 3,
    width: 1600,
    height: 1067,
    uploadedAt: '2026-05-01T08:02:00.000Z',
  },
];

writeFileSync(join(ROOT, 'data/bookings.json'), JSON.stringify(bookings, null, 2) + '\n');
writeFileSync(join(ROOT, 'data/images.json'), JSON.stringify(images, null, 2) + '\n');
console.log(`seeded data/bookings.json (${bookings.length}) + data/images.json (${images.length}) — lang=${lang}`);
