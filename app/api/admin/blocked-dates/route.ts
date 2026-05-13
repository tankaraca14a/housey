import { NextRequest, NextResponse } from 'next/server';
import { blockedDates as blockedRepo } from '@/app/lib/store-factory';

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
    await blockedRepo.set(blockedDates as string[]);
    return NextResponse.json({ success: true, blockedDates });
  } catch (e) {
    console.error('blocked-dates persist failed:', e);
    return NextResponse.json({ error: 'could not save blocked dates' }, { status: 503 });
  }
}
