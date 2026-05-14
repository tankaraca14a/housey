// Returns the blocked-dates audit log — every block/unblock change with
// who did it (IP + UA) and when. Used by scripts/blocked-dates-report.mjs
// to distinguish owner-set dates, auto-blocks from /confirm, and test
// residue (test runs have distinctive User-Agents like 'HeadlessChrome'
// or 'Playwright').

import { NextRequest, NextResponse } from 'next/server';
import { listAudit } from '@/app/lib/blocked-dates-audit';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

export async function GET(request: NextRequest) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const entries = await listAudit();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error('audit read failed:', e);
    return NextResponse.json({ error: 'audit read failed' }, { status: 500 });
  }
}
