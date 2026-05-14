import { NextRequest, NextResponse } from 'next/server';
import { blockedDates as blockedRepo } from '@/app/lib/store-factory';
import { recordAudit, type AuditEntry } from '@/app/lib/blocked-dates-audit';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

export async function GET() {
  try {
    const dates = await blockedRepo.list();
    return NextResponse.json({ blockedDates: dates });
  } catch (error) {
    console.error('Error reading blocked dates:', error);
    return NextResponse.json({ error: 'Failed to read blocked dates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { blockedDates } = body as { blockedDates: unknown };
  if (!Array.isArray(blockedDates)) {
    return NextResponse.json({ error: 'blockedDates must be an array' }, { status: 400 });
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!blockedDates.every((d) => typeof d === 'string' && dateRe.test(d))) {
    return NextResponse.json({ error: 'every entry must be YYYY-MM-DD' }, { status: 400 });
  }

  try {
    // Diff against the current set so the audit records only the changes.
    const previous = new Set(await blockedRepo.list());
    const next = new Set(blockedDates as string[]);
    const added: string[] = [];
    const removed: string[] = [];
    for (const d of next) if (!previous.has(d)) added.push(d);
    for (const d of previous) if (!next.has(d)) removed.push(d);

    await blockedRepo.set(blockedDates as string[]);

    // Best-effort audit log. Captures IP (x-forwarded-for / x-real-ip),
    // user-agent, and a source tag so a later report can tell whether
    // each block was set manually by the owner, by a test script, or by
    // the auto-block path from /confirm. Failures never block the write.
    if (added.length + removed.length > 0) {
      const ts = new Date().toISOString();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      const ua = request.headers.get('user-agent') || 'unknown';
      const entries: AuditEntry[] = [
        ...added.map((date) => ({ ts, action: 'block' as const, date, source: 'manual' as const, ip, ua })),
        ...removed.map((date) => ({ ts, action: 'unblock' as const, date, source: 'manual' as const, ip, ua })),
      ];
      await recordAudit(entries);
    }

    return NextResponse.json({ success: true, blockedDates });
  } catch (e) {
    console.error('blocked-dates persist failed:', e);
    return NextResponse.json({ error: 'could not save blocked dates' }, { status: 503 });
  }
}
