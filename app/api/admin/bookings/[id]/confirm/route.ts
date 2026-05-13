import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json');
const BLOCKED_DATES_FILE = path.join(process.cwd(), 'data', 'blocked-dates.json');
const ADMIN_PASSWORD = 'ivana2026';

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
}

async function readBookings(): Promise<Booking[]> {
  try {
    const content = await fs.readFile(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeBookings(bookings: Booking[]): Promise<void> {
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

async function readBlockedDates(): Promise<string[]> {
  try {
    const content = await fs.readFile(BLOCKED_DATES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeBlockedDates(dates: string[]): Promise<void> {
  await fs.mkdir(path.dirname(BLOCKED_DATES_FILE), { recursive: true });
  await fs.writeFile(BLOCKED_DATES_FILE, JSON.stringify(dates, null, 2), 'utf-8');
}

function getDatesInRange(checkIn: string, checkOut: string): string[] {
  // Block the nights the guest is actually sleeping there: [checkIn, checkOut).
  // Checkout day is exclusive so the next guest can arrive the same day
  // (matches the guest-side calendar, which also treats checkout exclusively).
  const dates: string[] = [];
  const end = new Date(checkOut);
  const current = new Date(checkIn);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get('x-admin-password');
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const bookings = await readBookings();
    const bookingIndex = bookings.findIndex((b) => b.id === id);

    if (bookingIndex === -1) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[bookingIndex];

    // Update status
    bookings[bookingIndex] = { ...booking, status: 'confirmed' };
    await writeBookings(bookings);

    // Block dates
    const newDates = getDatesInRange(booking.checkIn, booking.checkOut);
    const existing = await readBlockedDates();
    const merged = Array.from(new Set([...existing, ...newDates])).sort();
    await writeBlockedDates(merged);

    // Send confirmation email to guest
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Housey <noreply@tankaraca.com>',
      to: [booking.email],
      subject: 'Booking Confirmed — Housey, Vela Luka',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #e07b2e;">Your Booking is Confirmed! 🎉</h2>
          <p>Dear ${booking.name},</p>
          <p>We're thrilled to confirm your booking at <strong>Housey, Vela Luka</strong>. We can't wait to welcome you!</p>

          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Check-in:</strong> ${booking.checkIn} at 16:00</p>
            <p><strong>Check-out:</strong> ${booking.checkOut} at 10:00</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
          </div>

          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Address</h3>
            <p>Tankaraca 14a, Vela Luka, Korčula</p>
          </div>

          <p>If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:tankaraca14a@gmail.com">tankaraca14a@gmail.com</a>.</p>
          <p>We look forward to your stay!</p>
          <p>Warm regards,<br><strong>The Housey Team</strong></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
