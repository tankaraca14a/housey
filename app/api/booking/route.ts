import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json');

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
  await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

// Minimal payload validation. The client uses zod, but the route must guard
// too in case requests bypass the form.
function validatePayload(b: Partial<Booking>): string | null {
  if (!b.name || typeof b.name !== 'string' || b.name.trim().length < 2) return 'name required';
  if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email)) return 'valid email required';
  if (!b.phone || b.phone.trim().length < 5) return 'phone required';
  if (!b.checkIn || !/^\d{4}-\d{2}-\d{2}$/.test(b.checkIn)) return 'checkIn must be YYYY-MM-DD';
  if (!b.checkOut || !/^\d{4}-\d{2}-\d{2}$/.test(b.checkOut)) return 'checkOut must be YYYY-MM-DD';
  if (b.checkOut <= b.checkIn) return 'checkOut must be after checkIn';
  if (!b.guests) return 'guests required';
  return null;
}

// Duplicate guard: within the last 5 minutes, same email + same date range =
// likely a double-submit. Don't write a second row; just acknowledge.
function isDuplicate(existing: Booking[], candidate: Booking): boolean {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  return existing.some((b) =>
    b.email === candidate.email &&
    b.checkIn === candidate.checkIn &&
    b.checkOut === candidate.checkOut &&
    Date.parse(b.createdAt) >= fiveMinAgo
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, checkIn, checkOut, guests, message } = body;

    const err = validatePayload({ name, email, phone, checkIn, checkOut, guests });
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    // Persist FIRST. Losing a booking because the email service blipped is
    // worse than a missing notification — Ivana sees the booking in the admin
    // dashboard either way.
    const booking: Booking = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const bookings = await readBookings();
    if (isDuplicate(bookings, booking)) {
      return NextResponse.json({ success: true, duplicate: true });
    }
    bookings.push(booking);
    await writeBookings(bookings);

    // Best-effort email. If RESEND_API_KEY is missing or Resend rejects, log
    // and continue — the booking is already saved.
    let emailSent = false;
    let emailError: string | null = null;
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: 'Housey Bookings <bookings@tankaraca.com>',
          to: ['tankaraca14a@gmail.com'],
          replyTo: email,
          subject: `New Booking Request from ${name}`,
          html: `
            <h2>New Booking Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Check-in:</strong> ${checkIn}</p>
            <p><strong>Check-out:</strong> ${checkOut}</p>
            <p><strong>Number of Guests:</strong> ${guests}</p>
            ${message ? `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>` : ''}
            <hr>
            <p><em>Reply to this email to respond to the guest.</em></p>
          `,
        });
        if (error) {
          emailError = typeof error === 'string' ? error : JSON.stringify(error);
          console.error('Resend error (booking saved, email failed):', error);
        } else {
          emailSent = true;
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
        console.error('Resend threw (booking saved, email failed):', e);
      }
    } else {
      emailError = 'RESEND_API_KEY not configured';
      console.warn('Booking saved without notification — RESEND_API_KEY not set.');
    }

    return NextResponse.json({ success: true, id: booking.id, emailSent, emailError });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
