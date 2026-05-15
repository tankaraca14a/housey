// Server-side email templates per language. These are NOT loaded from the
// client LangProvider — they're used in API routes where the guest's
// preferred language is stored on the Booking row (`booking.lang`).
//
// Keep these strings standalone (no React, no client) so the routes can
// import this from a Node-only context.

import type { Booking } from "@/app/lib/bookings";

type SupportedLang = 'en' | 'hr' | 'de' | 'it' | 'fr';

function langOf(b: Pick<Booking, 'lang'> | undefined | null): SupportedLang {
  const v = b?.lang;
  return v && (['en', 'hr', 'de', 'it', 'fr'] as const).includes(v) ? v : 'en';
}

// ─── Confirmation email (guest-facing, sent on admin Confirm) ──────────────
interface ConfirmStrings {
  subject: string;
  heading: string;
  dear: (name: string) => string;
  intro: string;
  detailsHeading: string;
  checkInLabel: string;
  checkOutLabel: string;
  guestsLabel: string;
  closing: string;
  signoff: string;
}

const CONFIRM: Record<SupportedLang, ConfirmStrings> = {
  en: {
    subject: 'Booking Confirmed — Housey, Vela Luka',
    heading: 'Your Booking is Confirmed! 🎉',
    dear: (name) => `Dear ${name},`,
    intro: 'We are delighted to confirm your reservation at <strong>Housey, Vela Luka</strong>. We look forward to welcoming you.',
    detailsHeading: 'Booking Details',
    checkInLabel: 'Check-in:',
    checkOutLabel: 'Check-out:',
    guestsLabel: 'Guests:',
    closing: 'If you have any questions before your stay, just reply to this email.',
    signoff: 'Warm regards,<br>Housey, Vela Luka',
  },
  hr: {
    subject: 'Rezervacija potvrđena — Housey, Vela Luka',
    heading: 'Vaša rezervacija je potvrđena! 🎉',
    dear: (name) => `Poštovani/a ${name},`,
    intro: 'Sa zadovoljstvom potvrđujemo vašu rezervaciju u kući <strong>Housey, Vela Luka</strong>. Radujemo se vašem dolasku.',
    detailsHeading: 'Detalji rezervacije',
    checkInLabel: 'Dolazak:',
    checkOutLabel: 'Odlazak:',
    guestsLabel: 'Gosti:',
    closing: 'Ako imate pitanja prije dolaska, samo odgovorite na ovaj e-mail.',
    signoff: 'Srdačan pozdrav,<br>Housey, Vela Luka',
  },
  de: {
    subject: 'Buchung bestätigt — Housey, Vela Luka',
    heading: 'Ihre Buchung ist bestätigt! 🎉',
    dear: (name) => `Sehr geehrte/r ${name},`,
    intro: 'Wir freuen uns, Ihre Reservierung im <strong>Housey, Vela Luka</strong> zu bestätigen. Wir freuen uns auf Ihren Besuch.',
    detailsHeading: 'Buchungsdetails',
    checkInLabel: 'Anreise:',
    checkOutLabel: 'Abreise:',
    guestsLabel: 'Gäste:',
    closing: 'Bei Fragen vor Ihrer Anreise antworten Sie einfach auf diese E-Mail.',
    signoff: 'Mit freundlichen Grüßen,<br>Housey, Vela Luka',
  },
  it: {
    subject: 'Prenotazione confermata — Housey, Vela Luka',
    heading: 'La tua prenotazione è confermata! 🎉',
    dear: (name) => `Gentile ${name},`,
    intro: 'Siamo lieti di confermare la tua prenotazione presso <strong>Housey, Vela Luka</strong>. Non vediamo l\'ora di accoglierti.',
    detailsHeading: 'Dettagli della prenotazione',
    checkInLabel: 'Check-in:',
    checkOutLabel: 'Check-out:',
    guestsLabel: 'Ospiti:',
    closing: 'Se hai domande prima del tuo soggiorno, rispondi semplicemente a questa email.',
    signoff: 'Cordiali saluti,<br>Housey, Vela Luka',
  },
  fr: {
    subject: 'Réservation confirmée — Housey, Vela Luka',
    heading: 'Votre réservation est confirmée ! 🎉',
    dear: (name) => `Cher/Chère ${name},`,
    intro: 'Nous sommes ravis de confirmer votre réservation à <strong>Housey, Vela Luka</strong>. Nous nous réjouissons de votre venue.',
    detailsHeading: 'Détails de la réservation',
    checkInLabel: 'Arrivée :',
    checkOutLabel: 'Départ :',
    guestsLabel: 'Voyageurs :',
    closing: 'Pour toute question avant votre séjour, il vous suffit de répondre à cet e-mail.',
    signoff: 'Cordialement,<br>Housey, Vela Luka',
  },
};

export function confirmEmail(booking: Pick<Booking, 'name' | 'checkIn' | 'checkOut' | 'guests' | 'lang'>) {
  const t = CONFIRM[langOf(booking)];
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e07b2e;">${t.heading}</h2>
      <p>${t.dear(booking.name)}</p>
      <p>${t.intro}</p>
      <div style="background: #f7f7f7; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">${t.detailsHeading}</h3>
        <p><strong>${t.checkInLabel}</strong> ${booking.checkIn}</p>
        <p><strong>${t.checkOutLabel}</strong> ${booking.checkOut}</p>
        <p><strong>${t.guestsLabel}</strong> ${booking.guests}</p>
      </div>
      <p>${t.closing}</p>
      <p>${t.signoff}</p>
    </div>
  `;
  return { subject: t.subject, html };
}

// ─── Decline email (guest-facing, sent on admin Decline) ───────────────────
interface DeclineStrings {
  subject: string;
  heading: string;
  dear: (name: string) => string;
  thanks: string;
  body: string;
  signoff: string;
}

const DECLINE: Record<SupportedLang, DeclineStrings> = {
  en: {
    subject: 'Booking Request — Housey, Vela Luka',
    heading: 'Booking Request Update',
    dear: (name) => `Dear ${name},`,
    thanks: 'Thank you for your interest in staying at <strong>Housey, Vela Luka</strong>.',
    body: 'Unfortunately, we are unable to accommodate your requested dates at this time. We hope you will consider us for a future stay.',
    signoff: 'Warm regards,<br>Housey, Vela Luka',
  },
  hr: {
    subject: 'Zahtjev za rezervaciju — Housey, Vela Luka',
    heading: 'Ažuriranje zahtjeva za rezervaciju',
    dear: (name) => `Poštovani/a ${name},`,
    thanks: 'Hvala vam na interesu za boravak u kući <strong>Housey, Vela Luka</strong>.',
    body: 'Nažalost, nismo u mogućnosti prihvatiti vaš zahtjev za odabrane datume. Nadamo se da ćete nas razmotriti za neki budući boravak.',
    signoff: 'Srdačan pozdrav,<br>Housey, Vela Luka',
  },
  de: {
    subject: 'Buchungsanfrage — Housey, Vela Luka',
    heading: 'Aktualisierung Ihrer Buchungsanfrage',
    dear: (name) => `Sehr geehrte/r ${name},`,
    thanks: 'Vielen Dank für Ihr Interesse an einem Aufenthalt im <strong>Housey, Vela Luka</strong>.',
    body: 'Leider können wir Ihre gewünschten Termine derzeit nicht annehmen. Wir hoffen, Sie ziehen uns für einen zukünftigen Aufenthalt in Betracht.',
    signoff: 'Mit freundlichen Grüßen,<br>Housey, Vela Luka',
  },
  it: {
    subject: 'Richiesta di prenotazione — Housey, Vela Luka',
    heading: 'Aggiornamento sulla richiesta di prenotazione',
    dear: (name) => `Gentile ${name},`,
    thanks: 'Grazie per il tuo interesse a soggiornare presso <strong>Housey, Vela Luka</strong>.',
    body: 'Purtroppo non possiamo accogliere le date richieste in questo momento. Speriamo che vorrai prenderci in considerazione per un futuro soggiorno.',
    signoff: 'Cordiali saluti,<br>Housey, Vela Luka',
  },
  fr: {
    subject: 'Demande de réservation — Housey, Vela Luka',
    heading: 'Mise à jour de la demande de réservation',
    dear: (name) => `Cher/Chère ${name},`,
    thanks: 'Merci de votre intérêt pour un séjour à <strong>Housey, Vela Luka</strong>.',
    body: 'Malheureusement, nous ne pouvons pas accepter les dates demandées pour le moment. Nous espérons que vous penserez à nous pour un prochain séjour.',
    signoff: 'Cordialement,<br>Housey, Vela Luka',
  },
};

export function declineEmail(booking: Pick<Booking, 'name' | 'lang'>) {
  const t = DECLINE[langOf(booking)];
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e07b2e;">${t.heading}</h2>
      <p>${t.dear(booking.name)}</p>
      <p>${t.thanks}</p>
      <p>${t.body}</p>
      <p>${t.signoff}</p>
    </div>
  `;
  return { subject: t.subject, html };
}
