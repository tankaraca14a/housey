import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

const BOOKINGS_FILE = path.join(process.cwd(), 'data', 'bookings.json');
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
    bookings[bookingIndex] = { ...booking, status: 'declined' };
    await writeBookings(bookings);

    // Send decline email to guest
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Housey <noreply@tankaraca.com>',
      to: [booking.email],
      subject: 'Booking Request — Housey, Vela Luka',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #e07b2e;">Booking Request Update</h2>
          <p>Dear ${booking.name},</p>
          <p>Thank you for your interest in staying at <strong>Housey, Vela Luka</strong>.</p>
          <p>Unfortunately, we're unable to accommodate your request for the dates <strong>${booking.checkIn}</strong> to <strong>${booking.checkOut}</strong>, as these dates are not available.</p>
          <p>We'd love to host you on different dates! Please check our availability and feel free to submit a new booking request. We hope to welcome you to Vela Luka soon.</p>
          <p>If you have any questions or would like to discuss alternative dates, don't hesitate to reach out at <a href="mailto:tankaraca14a@gmail.com">tankaraca14a@gmail.com</a>.</p>
          <p>Warm regards,<br><strong>The Housey Team</strong></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
