import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'blocked-dates.json');
const ADMIN_PASSWORD = 'ivana2025';

async function readBlockedDates(): Promise<string[]> {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeBlockedDates(dates: string[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(dates, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const dates = await readBlockedDates();
    return NextResponse.json({ blockedDates: dates });
  } catch (error) {
    console.error('Error reading blocked dates:', error);
    return NextResponse.json({ error: 'Failed to read blocked dates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { blockedDates } = body;

    if (!Array.isArray(blockedDates)) {
      return NextResponse.json({ error: 'Invalid data: blockedDates must be an array' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const valid = blockedDates.every((d) => typeof d === 'string' && dateRegex.test(d));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    await writeBlockedDates(blockedDates);
    return NextResponse.json({ success: true, blockedDates });
  } catch (error) {
    console.error('Error saving blocked dates:', error);
    return NextResponse.json({ error: 'Failed to save blocked dates' }, { status: 500 });
  }
}
