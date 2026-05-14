// Smoke tests for response headers. Next.js sets sensible defaults but
// it's worth pinning so a future regression is caught.

const BASE = 'http://localhost:3457';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

const r = await fetch(`${BASE}/`);
const h = (name) => r.headers.get(name);

log('=== Response headers on / ===');
ok(r.status === 200, `homepage 200 (got ${r.status})`);
ok(h('content-type')?.includes('text/html'), `content-type: ${h('content-type')}`);

// What the framework gives us by default
const xPoweredBy = h('x-powered-by');
ok(xPoweredBy === null || /next/i.test(xPoweredBy ?? ''), `x-powered-by: ${xPoweredBy}`);

// Probe a few admin endpoints to ensure they DON'T cache
const adminGet = await fetch(`${BASE}/api/admin/bookings`);
const adminCC = adminGet.headers.get('cache-control');
ok(adminCC === null || !/public/.test(adminCC ?? ''), `admin GET cache-control NOT public (got: ${adminCC})`);

// 401 page returns Content-Type application/json
const unauth = await fetch(`${BASE}/api/admin/bookings`);
ok(unauth.status === 401, `401 returned for unauth admin GET (got ${unauth.status})`);
ok(unauth.headers.get('content-type')?.includes('application/json'), `401 content-type is json`);

// Public /api/images is safe to be cached briefly — but we'd rather not pin
// it since Vercel may inject its own CDN headers. Just check it returns json.
const publicImages = await fetch(`${BASE}/api/images`);
ok(publicImages.headers.get('content-type')?.includes('application/json'), `public images is json`);
ok(publicImages.status === 200, `public images 200`);

log('');
log(failures === 0 ? 'PASS — response header smoke green ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
