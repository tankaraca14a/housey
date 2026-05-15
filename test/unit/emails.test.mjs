import { describe, it, expect } from 'vitest';
import { confirmEmail, declineEmail } from '../../app/lib/i18n/emails.ts';

const BOOKING = {
  name: 'Test Guest',
  checkIn: '2026-08-15',
  checkOut: '2026-08-22',
  guests: '2',
};

// Markers that should ONLY appear in their respective language's body.
const MARKERS = {
  en: { confirm: /Booking is Confirmed/i, decline: /unable to accommodate/i },
  hr: { confirm: /Rezervacija potvrđena|potvrđena/, decline: /nismo u mogućnosti/ },
  de: { confirm: /Buchung ist bestätigt/, decline: /leider können wir/i },
  it: { confirm: /prenotazione è confermata/i, decline: /Purtroppo non possiamo/i },
  fr: { confirm: /réservation est confirmée/i, decline: /Malheureusement/i },
};

describe('confirmEmail', () => {
  for (const lang of ['en', 'hr', 'de', 'it', 'fr']) {
    it(`renders ${lang}-language body`, () => {
      const { subject, html } = confirmEmail({ ...BOOKING, lang });
      expect(subject).toMatch(/Housey, Vela Luka/);
      expect(html).toMatch(MARKERS[lang].confirm);
      expect(html).toContain(BOOKING.name);
      expect(html).toContain(BOOKING.checkIn);
      expect(html).toContain(BOOKING.checkOut);
      expect(html).toContain(BOOKING.guests);
    });
  }
  it('falls back to EN when lang is missing', () => {
    const { html } = confirmEmail({ ...BOOKING });
    expect(html).toMatch(/Booking is Confirmed/i);
  });
  it('falls back to EN when lang is invalid', () => {
    // @ts-expect-error intentionally bogus
    const { html } = confirmEmail({ ...BOOKING, lang: 'xx' });
    expect(html).toMatch(/Booking is Confirmed/i);
  });
});

describe('declineEmail', () => {
  for (const lang of ['en', 'hr', 'de', 'it', 'fr']) {
    it(`renders ${lang}-language body`, () => {
      const { subject, html } = declineEmail({ name: BOOKING.name, lang });
      expect(subject).toMatch(/Housey, Vela Luka/);
      expect(html).toMatch(MARKERS[lang].decline);
      expect(html).toContain(BOOKING.name);
    });
  }
  it('subjects differ per language', () => {
    const subjects = ['en', 'hr', 'de', 'it', 'fr']
      .map((lang) => declineEmail({ name: BOOKING.name, lang }).subject);
    const unique = new Set(subjects);
    expect(unique.size).toBe(5);
  });
});
