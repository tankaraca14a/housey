"use client";

import { useState, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import type { Image as ImageRow, Category } from "@/app/lib/images";
// The admin password is no longer hardcoded. It's typed at login and held
// in React state for the session (cleared on tab close). Verification is
// done by an authenticated GET — if the server returns 200 the password
// is good; 401 means wrong password. Server reads ADMIN_PASSWORD env var
// with 'ivana2026' as the local-dev fallback.

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Translations ──────────────────────────────────────────────────────────────
interface Translations {
  adminLogin: string;
  password: string;
  login: string;
  wrongPassword: string;
  blockedDates: string;
  saveChanges: string;
  saving: string;
  changesSaved: string;
  saveFailed: string;
  clickToBlock: string;
  previous: string;
  next: string;
  loading: string;
  blocked: string;
  available: string;
  past: string;
  monthNames: string[];
  dayNames: string[];
  bookings: string;
  refresh: string;
  noBookings: string;
  loadingBookings: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  confirm: string;
  decline: string;
  confirmed: string;
  declined: string;
  pending: string;
  confirming: string;
  declining: string;
  total: string;
  pendingCount: string;
  submitted: string;
  logout: string;
  delete: string;
  deleting: string;
  deleteConfirm: string;
  deleteConfirm2: string;
  undo: string;
  deletedToast: string;
  edit: string;
  editing: string;
  save: string;
  cancel: string;
  addBooking: string;
  confirmConfirm: string;
  confirmConfirm2: string;
  declineConfirm: string;
  declineConfirm2: string;
  editedToast: string;
  editUndoFailed: string;
  creating: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  statusLabel: string;
  saveFailedShort: string;
}

const translations: Record<"hr" | "en", Translations> = {
  hr: {
    adminLogin: "Admin prijava",
    password: "Lozinka",
    login: "Prijava",
    wrongPassword: "Pogrešna lozinka",
    blockedDates: "Blokirani datumi",
    saveChanges: "Spremi promjene",
    saving: "Spremanje...",
    changesSaved: "Promjene spremljene!",
    saveFailed: "Spremanje nije uspjelo. Pokušajte ponovo.",
    clickToBlock: "Kliknite datume za blokiranje/odblokiranje",
    previous: "Prethodni",
    next: "Sljedeći",
    loading: "Učitavanje...",
    blocked: "Blokirano",
    available: "Dostupno",
    past: "Prošlo",
    monthNames: [
      "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
      "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
    ],
    dayNames: ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"],
    bookings: "Rezervacije",
    refresh: "Osvježi",
    noBookings: "Još nema rezervacija",
    loadingBookings: "Učitavanje rezervacija...",
    checkIn: "Dolazak",
    checkOut: "Odlazak",
    guests: "Gosti",
    message: "Poruka",
    confirm: "Potvrdi",
    decline: "Odbij",
    confirmed: "Potvrđeno",
    declined: "Odbijeno",
    pending: "Na čekanju",
    confirming: "Potvrđivanje...",
    declining: "Odbijanje...",
    total: "ukupno",
    pendingCount: "na čekanju",
    submitted: "Poslano",
    logout: "Odjava",
    delete: "Obriši",
    deleting: "Brisanje...",
    deleteConfirm: "Obrisati ovu rezervaciju?",
    deleteConfirm2: "Sigurno trajno obrisati rezervaciju za:",
    undo: "Poništi",
    deletedToast: "Rezervacija obrisana",
    edit: "Uredi",
    editing: "Uređivanje...",
    save: "Spremi",
    cancel: "Odustani",
    addBooking: "Dodaj rezervaciju",
    confirmConfirm: "Potvrditi ovu rezervaciju?",
    confirmConfirm2: "Ovo će poslati email gostu da je rezervacija POTVRĐENA i blokirat će datume:",
    declineConfirm: "Odbiti ovu rezervaciju?",
    declineConfirm2: "Ovo će poslati email gostu da rezervacija NIJE PRIHVAĆENA:",
    editedToast: "Rezervacija uređena",
    editUndoFailed: "Poništavanje nije uspjelo",
    creating: "Stvaranje...",
    nameLabel: "Ime",
    emailLabel: "Email",
    phoneLabel: "Telefon",
    statusLabel: "Status",
    saveFailedShort: "Spremanje neuspješno",
  },
  en: {
    adminLogin: "Admin Login",
    password: "Password",
    login: "Login",
    wrongPassword: "Wrong password",
    blockedDates: "Blocked Dates",
    saveChanges: "Save Changes",
    saving: "Saving...",
    changesSaved: "Changes saved!",
    saveFailed: "Failed to save. Please try again.",
    clickToBlock: "Click dates to block/unblock",
    previous: "Previous",
    next: "Next",
    loading: "Loading...",
    blocked: "Blocked",
    available: "Available",
    past: "Past",
    monthNames: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    bookings: "Bookings",
    refresh: "Refresh",
    noBookings: "No bookings yet",
    loadingBookings: "Loading bookings...",
    checkIn: "Check-in",
    checkOut: "Check-out",
    guests: "Guests",
    message: "Message",
    confirm: "Confirm",
    decline: "Decline",
    confirmed: "Confirmed",
    declined: "Declined",
    pending: "Pending",
    confirming: "Confirming...",
    declining: "Declining...",
    total: "total",
    pendingCount: "pending",
    submitted: "Submitted",
    logout: "Logout",
    delete: "Delete",
    deleting: "Deleting...",
    deleteConfirm: "Delete this booking?",
    deleteConfirm2: "Are you sure you want to permanently delete the booking for:",
    undo: "Undo",
    deletedToast: "Booking deleted",
    edit: "Edit",
    editing: "Editing...",
    save: "Save",
    cancel: "Cancel",
    addBooking: "Add booking",
    confirmConfirm: "Confirm this booking?",
    confirmConfirm2: "This will EMAIL the guest that their booking is CONFIRMED and block these dates:",
    declineConfirm: "Decline this booking?",
    declineConfirm2: "This will EMAIL the guest that their booking is declined:",
    editedToast: "Booking edited",
    editUndoFailed: "Undo failed",
    creating: "Creating...",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    statusLabel: "Status",
    saveFailedShort: "Save failed",
  },
};

type Lang = "hr" | "en";

interface CalendarMonthProps {
  year: number;
  month: number;
  blockedDates: Set<string>;
  onToggle: (date: string) => void;
  t: Translations;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  status: "pending" | "confirmed" | "declined";
  createdAt: string;
}

type EditForm = Omit<Booking, "id" | "createdAt">;

function CalendarMonth({ year, month, blockedDates, onToggle, t }: CalendarMonthProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-surface-800 border border-white/10 rounded-2xl p-4 md:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        {t.monthNames[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {t.dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = formatDate(year, month, day);
          const isPast = new Date(year, month, day) < today;
          const isBlocked = blockedDates.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && onToggle(dateStr)}
              disabled={isPast}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${isPast
                  ? "text-slate-600 cursor-not-allowed"
                  : isBlocked
                  ? "bg-red-500/80 text-white hover:bg-red-400"
                  : "text-slate-200 hover:bg-brand-500/30 hover:text-brand-300"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BookingEditPanelProps {
  t: Translations;
  form: EditForm;
  setForm: (f: EditForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  mode: "create" | "edit";
}

function BookingEditPanel({ t, form, setForm, onSave, onCancel, saving, error, mode }: BookingEditPanelProps) {
  const set = (patch: Partial<EditForm>) => setForm({ ...form, ...patch });
  const field = "w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-400 transition";
  return (
    <div data-testid={mode === "create" ? "booking-add-panel" : "booking-edit-panel"}
         className="bg-surface-800 border border-brand-400/40 rounded-2xl p-6 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-slate-400">{t.nameLabel}
          <input className={field} value={form.name}
                 onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="text-xs text-slate-400">{t.emailLabel}
          <input type="email" className={field} value={form.email}
                 onChange={(e) => set({ email: e.target.value })} />
        </label>
        <label className="text-xs text-slate-400">{t.phoneLabel}
          <input className={field} value={form.phone}
                 onChange={(e) => set({ phone: e.target.value })} />
        </label>
        <label className="text-xs text-slate-400">{t.guests}
          <select className={field} value={form.guests}
                  onChange={(e) => set({ guests: e.target.value })}>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">{t.checkIn}
          <input type="date" className={field} value={form.checkIn}
                 onChange={(e) => set({ checkIn: e.target.value })} />
        </label>
        <label className="text-xs text-slate-400">{t.checkOut}
          <input type="date" className={field} value={form.checkOut}
                 onChange={(e) => set({ checkOut: e.target.value })} />
        </label>
        <label className="text-xs text-slate-400 sm:col-span-2">{t.statusLabel}
          <select className={field} value={form.status}
                  onChange={(e) => set({ status: e.target.value as Booking["status"] })}>
            <option value="pending">{t.pending}</option>
            <option value="confirmed">{t.confirmed}</option>
            <option value="declined">{t.declined}</option>
          </select>
        </label>
        <label className="text-xs text-slate-400 sm:col-span-2">{t.message}
          <textarea rows={2} className={field} value={form.message}
                    onChange={(e) => set({ message: e.target.value })} />
        </label>
      </div>
      {error && <p className="text-sm text-red-400 mb-3" data-testid="edit-error">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} disabled={saving}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-slate-300 text-sm rounded-xl transition disabled:opacity-50 border border-white/10">
          {t.cancel}
        </button>
        <button onClick={onSave} disabled={saving} data-testid="edit-save"
                className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
          {saving ? (mode === "create" ? t.creating : t.saving) : t.save}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: Booking["status"]; t: Translations }) {
  const classes = {
    pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
    confirmed: "bg-green-500/20 text-green-300 border border-green-500/40",
    declined: "bg-red-500/20 text-red-300 border border-red-500/40",
  };
  const labels: Record<Booking["status"], string> = {
    pending: t.pending,
    confirmed: t.confirmed,
    declined: t.declined,
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function AdminPage() {
  const [lang, setLang] = useState<Lang>("hr");
  const t = translations[lang];

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // authPassword holds the verified-good password for the session; all
  // subsequent fetches use it. Set by handleLogin after the server says OK.
  const [authPassword, setAuthPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // ── Image management state ────────────────────────────────────────────────
  const [imagesList, setImagesList] = useState<ImageRow[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(0);  // count of in-flight uploads
  const [imageError, setImageError] = useState<string | null>(null);
  const [bookingAction, setBookingAction] = useState<Record<string, "confirming" | "declining" | "deleting" | "saving" | false>>({});

  // Inline edit + manual-create state. `editingId === "new"` means the
  // "Add booking" panel is open (with default values).
  const blankBooking = (): EditForm => ({
    name: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    message: "",
    status: "pending",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(blankBooking());
  const [editError, setEditError] = useState<string | null>(null);

  // Pending-delete state for the undo banner. Each entry is a booking that
  // the admin asked to delete; the actual DELETE API call fires after
  // DELETE_GRACE_MS unless Undo is clicked. The booking is hidden from the
  // visible list during the grace window so the admin sees the result of
  // their action immediately, but it's still in KV and can be restored.
  const DELETE_GRACE_MS = 10_000;
  interface PendingDelete {
    booking: Booking;
    timerId: ReturnType<typeof setTimeout>;
    deadline: number; // epoch ms
  }
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, PendingDelete>>({});

  // Same pattern for "I just edited a booking — undo within 10s". The
  // snapshot is the row BEFORE the edit; clicking Undo PATCHes back to it.
  interface PendingEdit {
    bookingId: string;
    snapshot: Booking;             // pre-edit values
    timerId: ReturnType<typeof setTimeout>;
    deadline: number;
    inFlight: boolean;             // true while the undo PATCH is mid-fetch
    error: string | null;
  }
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});

  const [nowMs, setNowMs] = useState(Date.now()); // ticks for the countdown

  const fetchBlockedDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const res = await fetch("/api/admin/blocked-dates");
      const data = await res.json();
      setBlockedDates(new Set(data.blockedDates || []));
    } catch (e) {
      console.error("Failed to load blocked dates", e);
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!authPassword) return;
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { "x-admin-password": authPassword },
      });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) {
      console.error("Failed to load bookings", e);
    } finally {
      setLoadingBookings(false);
    }
  }, [authPassword]);

  const fetchImages = useCallback(async () => {
    if (!authPassword) return;
    setLoadingImages(true);
    try {
      const res = await fetch("/api/admin/images", {
        headers: { "x-admin-password": authPassword },
      });
      const data = await res.json();
      setImagesList(data.images || []);
    } catch (e) {
      console.error("Failed to load images", e);
    } finally {
      setLoadingImages(false);
    }
  }, [authPassword]);

  // Upload one or more files. Each upload goes through Vercel Blob's
  // client-direct-upload flow (bypasses the 4.5 MB function body limit),
  // then we POST the resulting URL + metadata to /api/admin/images.
  // HEIC files from iPhones are converted to JPEG client-side via
  // heic2any before upload — the server only accepts jpeg/png/webp.
  const handleImageUpload = useCallback(async (fileList: FileList) => {
    setImageError(null);
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") ||
             /\.heic$|\.heif$/i.test(f.name),
    );
    if (files.length === 0) {
      setImageError("Pick JPEG, PNG, WebP, or HEIC files.");
      return;
    }
    setUploadingImages(files.length);
    try {
      for (const raw of files) {
        try {
          // HEIC detection: file.type can be 'image/heic', 'image/heif',
          // or sometimes EMPTY for unknown types — fall back to extension.
          const isHeic =
            raw.type === "image/heic" ||
            raw.type === "image/heif" ||
            /\.heic$|\.heif$/i.test(raw.name);
          let file: File | Blob = raw;
          let outName = raw.name;
          if (isHeic) {
            const heic2any = (await import("heic2any")).default;
            const converted = await heic2any({
              blob: raw,
              toType: "image/jpeg",
              quality: 0.9,
            });
            const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
            outName = raw.name.replace(/\.(heic|heif)$/i, ".jpg");
            file = new File([jpegBlob as BlobPart], outName, { type: "image/jpeg" });
          }
          // 1. Upload bytes directly to Blob.
          const contentType = (file as File).type || "image/jpeg";
          const blob = await upload(`housey/${Date.now()}-${outName}`, file, {
            access: "public",
            handleUploadUrl: "/api/admin/images/upload",
            clientPayload: JSON.stringify({ password: authPassword }),
            contentType,
          });

          // 2. Get image dimensions client-side. Browser-only utility —
          // safe here because this is a client component.
          const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = document.createElement("img");
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error("Couldn't read image dimensions"));
            img.src = URL.createObjectURL(file);
          });

          // 3. Insert metadata row.
          const res = await fetch("/api/admin/images", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": authPassword,
            },
            body: JSON.stringify({
              url: blob.url,
              blobPathname: blob.pathname,
              alt: outName.replace(/\.[^.]+$/, ""), // strip extension as default alt
              categories: [] as Category[],
              featured: false,
              sortOrder: Date.now(),
              width: dims.width,
              height: dims.height,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "could not save image metadata");
          }
        } finally {
          setUploadingImages((n) => Math.max(0, n - 1));
        }
      }
      await fetchImages();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload failed";
      console.error("image upload failed:", e);
      setImageError(msg);
    } finally {
      setUploadingImages(0);
    }
  }, [authPassword, fetchImages]);

  const handleImageDelete = useCallback(async (id: string) => {
    const img = imagesList.find((i) => i.id === id);
    if (!img) return;
    if (!confirm(`Delete this image?\n${img.alt || img.url}`)) return;
    if (!confirm(`This cannot be undone. Really delete?`)) return;
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": authPassword },
      });
      if (!res.ok) throw new Error("delete failed");
      await fetchImages();
    } catch (e) {
      console.error("delete image failed:", e);
      setImageError(e instanceof Error ? e.message : "delete failed");
    }
  }, [authPassword, fetchImages, imagesList]);

  const handleImageToggleFeatured = useCallback(async (id: string, next: boolean) => {
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": authPassword,
        },
        body: JSON.stringify({ featured: next }),
      });
      if (!res.ok) throw new Error("toggle featured failed");
      await fetchImages();
    } catch (e) {
      console.error("toggle featured failed:", e);
    }
  }, [authPassword, fetchImages]);

  useEffect(() => {
    if (authenticated) {
      fetchBlockedDates();
      fetchBookings();
      fetchImages();
    }
  }, [authenticated, fetchBlockedDates, fetchBookings, fetchImages]);

  // Verify the typed password by attempting an authenticated GET. The
  // server responds 200 on match, 401 on mismatch. We avoid storing the
  // password anywhere but in React state — it disappears on tab close.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setAuthPassword(password);
        setAuthenticated(true);
      } else if (res.status === 401) {
        setPasswordError(t.wrongPassword);
      } else {
        setPasswordError(t.saveFailedShort);
      }
    } catch {
      setPasswordError(t.saveFailedShort);
    } finally {
      setLoggingIn(false);
    }
  };

  // Wipe the in-memory password on logout so a later /admin visit by
  // someone else on the same browser doesn't inherit it.
  const handleLogout = () => {
    setAuthPassword("");
    setPassword("");
    setAuthenticated(false);
  };

  const toggleDate = (date: string) => {
    setBlockedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": authPassword,
        },
        body: JSON.stringify({ blockedDates: Array.from(blockedDates).sort() }),
      });
      if (!res.ok) {
        throw new Error("Failed to save");
      }
      setSaveMessage({ type: "success", text: t.changesSaved });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: "error", text: t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  // Quick Confirm — two confirms because this BOTH emails the guest AND
  // auto-blocks their dates. Both side-effects are irreversible (the email
  // is gone the moment Resend accepts it).
  const handleConfirm = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    if (!confirm(t.confirmConfirm)) return;
    const detail = `${booking.name} <${booking.email}>\n${booking.checkIn} → ${booking.checkOut}`;
    if (!confirm(`${t.confirmConfirm2}\n\n${detail}`)) return;
    setBookingAction((prev) => ({ ...prev, [id]: "confirming" }));
    try {
      const res = await fetch(`/api/admin/bookings/${id}/confirm`, {
        method: "POST",
        headers: { "x-admin-password": authPassword },
      });
      if (!res.ok) throw new Error("Failed to confirm");
      await fetchBookings();
      await fetchBlockedDates();
    } catch (e) {
      console.error("Failed to confirm booking", e);
    } finally {
      setBookingAction((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Quick Decline — two confirms because this emails the guest a rejection.
  const handleDecline = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    if (!confirm(t.declineConfirm)) return;
    const detail = `${booking.name} <${booking.email}>\n${booking.checkIn} → ${booking.checkOut}`;
    if (!confirm(`${t.declineConfirm2}\n\n${detail}`)) return;
    setBookingAction((prev) => ({ ...prev, [id]: "declining" }));
    try {
      const res = await fetch(`/api/admin/bookings/${id}/decline`, {
        method: "POST",
        headers: { "x-admin-password": authPassword },
      });
      if (!res.ok) throw new Error("Failed to decline");
      await fetchBookings();
    } catch (e) {
      console.error("Failed to decline booking", e);
    } finally {
      setBookingAction((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Two-step confirm + undo-able delete. The actual DELETE API call is
  // deferred by DELETE_GRACE_MS so a misclick can be recovered. During the
  // grace window the row is filtered out of the visible list and a toast
  // banner shows with an Undo button.
  const handleDelete = (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    // First confirm — generic
    if (!confirm(t.deleteConfirm)) return;
    // Second confirm — explicit with the guest name + dates
    const detail = `${booking.name}\n${booking.checkIn} → ${booking.checkOut}`;
    if (!confirm(`${t.deleteConfirm2}\n\n${detail}`)) return;

    // Schedule the actual API call. Held in state so Undo can cancel it.
    const timerId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/bookings/${id}`, {
          method: "DELETE",
          headers: { "x-admin-password": authPassword },
        });
        if (!res.ok) throw new Error("Failed to delete");
      } catch (e) {
        console.error("Failed to delete booking", e);
      } finally {
        setPendingDeletes((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        await fetchBookings();
      }
    }, DELETE_GRACE_MS);

    setPendingDeletes((prev) => ({
      ...prev,
      [id]: { booking, timerId, deadline: Date.now() + DELETE_GRACE_MS },
    }));
  };

  const handleUndoDelete = (id: string) => {
    const pending = pendingDeletes[id];
    if (!pending) return;
    clearTimeout(pending.timerId);
    setPendingDeletes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 4Hz tick for the countdown displays (delete + edit toasts). Only runs
  // while at least one toast is active — avoids re-rendering forever.
  useEffect(() => {
    if (Object.keys(pendingDeletes).length === 0 && Object.keys(pendingEdits).length === 0) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [pendingDeletes, pendingEdits]);

  // On unmount / logout: flush any pending deletes immediately. This makes
  // navigating away mid-grace-window NOT silently drop the action — the
  // delete still happens. The opposite design (cancel on unmount) would be
  // surprising too. We go with "fire-and-forget on unmount" to match the
  // user's intent at the moment of clicking Delete.
  useEffect(() => {
    return () => {
      Object.values(pendingDeletes).forEach((p) => {
        // Don't cancel the timer — let it fire. If we're unmounting, fetch
        // won't be called from inside the timer anymore, but the DELETE
        // request has already been queued via setTimeout closures pointing
        // to outer-scope fetch, so it'll still hit the server.
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Free status change (any → any) via PATCH. Used by the per-row <select>.
  const handleStatusChange = async (id: string, next: Booking["status"]) => {
    setBookingAction((prev) => ({ ...prev, [id]: "saving" }));
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": authPassword,
        },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchBookings();
    } catch (e) {
      console.error("Failed to change status", e);
    } finally {
      setBookingAction((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleEditOpen = (booking: Booking) => {
    setEditError(null);
    setEditingId(booking.id);
    setEditForm({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      message: booking.message,
      status: booking.status,
    });
  };

  const handleEditCancel = () => {
    setEditError(null);
    setEditingId(null);
    setEditForm(blankBooking());
  };

  const handleAddOpen = () => {
    setEditError(null);
    setEditingId("new");
    setEditForm(blankBooking());
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditError(null);
    setBookingAction((prev) => ({ ...prev, [editingId]: "saving" }));
    const isNew = editingId === "new";
    // Snapshot the pre-edit row BEFORE the API call so the undo path has
    // something to revert to. New bookings (POST) can't be "undone to a
    // previous state" — they just get deleted on undo instead.
    const snapshot = isNew ? null : bookings.find((b) => b.id === editingId);
    try {
      const url = isNew ? "/api/admin/bookings" : `/api/admin/bookings/${editingId}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": authPassword,
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || t.saveFailedShort);
        return;
      }
      // Only show undo for *edits* (PATCH), not for creates — undo of a
      // create would have to delete the row, which we already handle with a
      // separate flow (the Delete button + 10s grace).
      if (snapshot) {
        const bookingId = editingId;
        const timerId = setTimeout(() => {
          setPendingEdits((prev) => {
            const next = { ...prev };
            delete next[bookingId];
            return next;
          });
        }, DELETE_GRACE_MS);
        setPendingEdits((prev) => ({
          ...prev,
          [bookingId]: {
            bookingId,
            snapshot,
            timerId,
            deadline: Date.now() + DELETE_GRACE_MS,
            inFlight: false,
            error: null,
          },
        }));
      }
      await fetchBookings();
      setEditingId(null);
      setEditForm(blankBooking());
    } catch (e) {
      console.error("Failed to save booking", e);
      setEditError(t.saveFailedShort);
    } finally {
      if (editingId) setBookingAction((prev) => ({ ...prev, [editingId]: false }));
    }
  };

  // Revert a recent edit by PATCHing the row back to its pre-edit snapshot.
  // Cancels the grace timer first so we don't double-clear.
  const handleUndoEdit = async (bookingId: string) => {
    const pending = pendingEdits[bookingId];
    if (!pending) return;
    clearTimeout(pending.timerId);
    setPendingEdits((prev) => ({
      ...prev,
      [bookingId]: { ...pending, inFlight: true, error: null },
    }));
    try {
      // Patch only the editable fields — id and createdAt are immutable.
      const { id: _id, createdAt: _ca, ...patchable } = pending.snapshot;
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": authPassword,
        },
        body: JSON.stringify(patchable),
      });
      if (!res.ok) throw new Error("undo PATCH failed");
      await fetchBookings();
      setPendingEdits((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    } catch (e) {
      console.error("Failed to undo edit", e);
      setPendingEdits((prev) => ({
        ...prev,
        [bookingId]: { ...pending, inFlight: false, error: t.editUndoFailed },
      }));
    }
  };

  const LangToggle = () => (
    <button
      onClick={() => setLang((l) => (l === "hr" ? "en" : "hr"))}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 text-xs font-bold bg-surface-700 hover:bg-surface-600 text-slate-300 border border-white/10 rounded-lg transition"
      title={lang === "hr" ? "Switch to English" : "Prebaci na Hrvatski"}
    >
      {lang === "hr" ? "EN" : "HR"}
    </button>
  );

  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  if (!authenticated) {
    return (
      <>
        <LangToggle />
        <div className="min-h-[60vh] flex items-center justify-center container py-16">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
            <h1 className="text-2xl font-bold text-white mb-2 text-center">{t.adminLogin}</h1>
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="••••••••"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loggingIn || password.length === 0}
                className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {loggingIn ? "…" : t.login}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // Hide rows that are in the delete-grace window. They're still in KV, so
  // Undo just clears the pendingDeletes entry — no API call required.
  const visibleBookings = bookings.filter((b) => !pendingDeletes[b.id]);
  const pendingBookings = visibleBookings.filter((b) => b.status === "pending");
  const otherBookings = visibleBookings.filter((b) => b.status !== "pending");
  const pendingDeleteList = Object.values(pendingDeletes);
  const pendingEditList = Object.values(pendingEdits);

  return (
    <>
      <LangToggle />

      {/* ── Undo toasts (delete + edit) ── */}
      {(pendingDeleteList.length > 0 || pendingEditList.length > 0) && (
        <div data-testid="undo-toast-container"
             className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {pendingDeleteList.map((p) => {
            const secondsLeft = Math.max(0, Math.ceil((p.deadline - nowMs) / 1000));
            return (
              <div
                key={`del-${p.booking.id}`}
                data-testid={`undo-toast-${p.booking.id}`}
                className="bg-surface-800 border border-brand-400/50 shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[320px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">
                    🗑 {t.deletedToast}: <span className="text-slate-300 font-normal">{p.booking.name}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.booking.checkIn} → {p.booking.checkOut} · {secondsLeft}s
                  </p>
                </div>
                <button
                  onClick={() => handleUndoDelete(p.booking.id)}
                  data-testid={`undo-btn-${p.booking.id}`}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition whitespace-nowrap"
                >
                  ↶ {t.undo}
                </button>
              </div>
            );
          })}
          {pendingEditList.map((p) => {
            const secondsLeft = Math.max(0, Math.ceil((p.deadline - nowMs) / 1000));
            return (
              <div
                key={`edit-${p.bookingId}`}
                data-testid={`undo-edit-toast-${p.bookingId}`}
                className="bg-surface-800 border border-brand-400/50 shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[320px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">
                    ✎ {t.editedToast}: <span className="text-slate-300 font-normal">{p.snapshot.name}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.inFlight ? "…" : p.error ? <span className="text-red-400">{p.error}</span> : `${secondsLeft}s`}
                  </p>
                </div>
                <button
                  onClick={() => handleUndoEdit(p.bookingId)}
                  disabled={p.inFlight}
                  data-testid={`undo-edit-btn-${p.bookingId}`}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
                >
                  ↶ {t.undo}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="container py-16">
        <div className="max-w-5xl mx-auto">

          {/* ── Calendar Section ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-bold text-white">Admin — {t.blockedDates}</h1>
              <p className="text-slate-400 mt-1">{t.clickToBlock}</p>
            </div>
            <div className="flex items-center gap-3 mr-12">
              {saveMessage && (
                <span
                  className={`text-sm font-medium ${
                    saveMessage.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {saveMessage.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? t.saving : t.saveChanges}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-3 bg-surface-700 hover:bg-surface-600 text-slate-300 font-semibold rounded-xl transition border border-white/10 whitespace-nowrap"
              >
                {t.logout}
              </button>
            </div>
          </div>

          {loadingDates ? (
            <div className="text-center text-slate-400 py-16">{t.loading}</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
                  disabled={monthOffset === 0}
                  className="px-4 py-2 rounded-xl bg-surface-700 text-slate-300 hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm border border-white/10"
                >
                  ← {t.previous}
                </button>
                <button
                  onClick={() => setMonthOffset((o) => o + 1)}
                  className="px-4 py-2 rounded-xl bg-surface-700 text-slate-300 hover:bg-surface-600 text-sm border border-white/10"
                >
                  {t.next} →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {months.map(({ year, month }) => (
                  <CalendarMonth
                    key={`${year}-${month}`}
                    year={year}
                    month={month}
                    blockedDates={blockedDates}
                    onToggle={toggleDate}
                    t={t}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/80" />
              <span>{t.blocked}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-surface-700 border border-white/10" />
              <span>{t.available}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-surface-900" />
              <span>{t.past}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {blockedDates.size}{" "}
            {lang === "hr"
              ? `datum${blockedDates.size === 1 ? "" : "a"} trenutno blokirano`
              : `date${blockedDates.size !== 1 ? "s" : ""} currently blocked`}
          </p>

          {/* ── Images Section ── */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white">Images</h2>
                <p className="text-slate-400 mt-1">
                  {imagesList.length} uploaded
                  {uploadingImages > 0 ? ` · uploading ${uploadingImages}…` : ""}
                </p>
              </div>
              <label
                data-testid="image-upload-trigger"
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition cursor-pointer"
              >
                + Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  multiple
                  data-testid="image-upload-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageUpload(e.target.files);
                      e.target.value = ""; // allow re-picking same file
                    }
                  }}
                />
              </label>
            </div>

            {imageError && (
              <p
                data-testid="image-error"
                className="mb-3 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-xl"
              >
                {imageError}
              </p>
            )}

            {loadingImages ? (
              <div className="text-center text-slate-400 py-8">{t.loading}</div>
            ) : imagesList.length === 0 ? (
              <div className="bg-surface-800 border border-white/10 border-dashed rounded-2xl p-10 text-center text-slate-400">
                No uploaded images yet. Use the &ldquo;+ Upload&rdquo; button to add some.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imagesList.map((img) => (
                  <div
                    key={img.id}
                    data-testid={`image-tile-${img.id}`}
                    className="relative bg-surface-800 border border-white/10 rounded-xl overflow-hidden group"
                  >
                    {/* Plain <img> to avoid next/image domain config for arbitrary blob hosts */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt}
                      width={img.width}
                      height={img.height}
                      className="w-full aspect-square object-cover"
                    />
                    {img.featured && (
                      <div className="absolute top-2 left-2 bg-yellow-400/95 text-black text-[10px] font-bold px-2 py-0.5 rounded">★ FEATURED</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <p className="text-white text-xs truncate">{img.alt}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleImageToggleFeatured(img.id, !img.featured)}
                          data-testid={`image-featured-${img.id}`}
                          className="flex-1 text-xs px-2 py-1 bg-surface-700 hover:bg-yellow-500/30 text-slate-200 rounded transition"
                        >
                          {img.featured ? "Unstar" : "★ Feature"}
                        </button>
                        <button
                          onClick={() => handleImageDelete(img.id)}
                          data-testid={`image-delete-${img.id}`}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bookings Section ── */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white">{t.bookings}</h2>
                <p className="text-slate-400 mt-1">
                  {visibleBookings.length} {t.total} · {pendingBookings.length} {t.pendingCount}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddOpen}
                  className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition"
                >
                  + {t.addBooking}
                </button>
                <button
                  onClick={fetchBookings}
                  className="px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-slate-300 rounded-xl transition border border-white/10"
                >
                  {t.refresh}
                </button>
              </div>
            </div>

            {editingId === "new" && (
              <BookingEditPanel
                t={t}
                form={editForm}
                setForm={setEditForm}
                onSave={handleEditSave}
                onCancel={handleEditCancel}
                saving={bookingAction["new"] === "saving"}
                error={editError}
                mode="create"
              />
            )}

            {loadingBookings ? (
              <div className="text-center text-slate-400 py-16">{t.loadingBookings}</div>
            ) : bookings.length === 0 ? (
              <div className="bg-surface-800 border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-lg">{t.noBookings}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...pendingBookings, ...otherBookings].map((booking) => {
                  const action = bookingAction[booking.id];
                  const numGuests = Number(booking.guests);
                  const guestLabel =
                    lang === "hr"
                      ? `${numGuests} gost${numGuests === 1 ? "" : "a"}`
                      : `${numGuests} guest${numGuests !== 1 ? "s" : ""}`;
                  if (editingId === booking.id) {
                    return (
                      <BookingEditPanel
                        key={booking.id}
                        t={t}
                        form={editForm}
                        setForm={setEditForm}
                        onSave={handleEditSave}
                        onCancel={handleEditCancel}
                        saving={bookingAction[booking.id] === "saving"}
                        error={editError}
                        mode="edit"
                      />
                    );
                  }
                  return (
                    <div
                      key={booking.id}
                      className="bg-surface-800 border border-white/10 rounded-2xl p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-white truncate">{booking.name}</h3>
                            <StatusBadge status={booking.status} t={t} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">✉</span>
                              <a
                                href={`mailto:${booking.email}`}
                                className="text-brand-400 hover:text-brand-300 truncate"
                              >
                                {booking.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">📞</span>
                              <span>{booking.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">📅</span>
                              <span>
                                <span className="text-slate-500 mr-1">{t.checkIn}:</span>
                                {booking.checkIn}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">📅</span>
                              <span>
                                <span className="text-slate-500 mr-1">{t.checkOut}:</span>
                                {booking.checkOut}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-slate-500">👥</span>
                              <span>{guestLabel}</span>
                            </div>
                          </div>

                          {booking.message && (
                            <div className="mt-3 p-3 bg-surface-900 rounded-xl text-sm text-slate-400 border border-white/5">
                              <span className="text-slate-500 text-xs uppercase tracking-wider">{t.message}: </span>
                              {booking.message}
                            </div>
                          )}

                          <p className="mt-3 text-xs text-slate-600">
                            {t.submitted}{" "}
                            {new Date(booking.createdAt).toLocaleString(
                              lang === "hr" ? "hr-HR" : "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 shrink-0" data-testid={`row-actions-${booking.id}`}>
                          {booking.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleConfirm(booking.id)}
                                disabled={!!action}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
                              >
                                {action === "confirming" ? t.confirming : `✓ ${t.confirm}`}
                              </button>
                              <button
                                onClick={() => handleDecline(booking.id)}
                                disabled={!!action}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
                              >
                                {action === "declining" ? t.declining : `✗ ${t.decline}`}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEditOpen(booking)}
                            disabled={!!action}
                            data-testid={`edit-btn-${booking.id}`}
                            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-slate-200 hover:text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap border border-white/10"
                          >
                            ✎ {t.edit}
                          </button>
                          <select
                            value={booking.status}
                            disabled={!!action}
                            onChange={(e) => handleStatusChange(booking.id, e.target.value as Booking["status"])}
                            data-testid={`status-select-${booking.id}`}
                            className="px-3 py-2 bg-surface-900 border border-white/10 text-slate-200 text-sm rounded-xl transition disabled:opacity-50"
                          >
                            <option value="pending">{t.pending}</option>
                            <option value="confirmed">{t.confirmed}</option>
                            <option value="declined">{t.declined}</option>
                          </select>
                          <button
                            onClick={() => handleDelete(booking.id)}
                            disabled={!!action}
                            title={t.delete}
                            aria-label={t.delete}
                            data-testid={`delete-btn-${booking.id}`}
                            className="px-4 py-2 bg-surface-700 hover:bg-red-700 text-slate-300 hover:text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap border border-white/10"
                          >
                            {action === "deleting" ? t.deleting : `🗑 ${t.delete}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
