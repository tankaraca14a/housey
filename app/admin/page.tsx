"use client";

import { useState, useEffect, useCallback } from "react";

const ADMIN_PASSWORD = "ivana2026";

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarMonthProps {
  year: number;
  month: number;
  blockedDates: Set<string>;
  onToggle: (date: string) => void;
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

function CalendarMonth({ year, month, blockedDates, onToggle }: CalendarMonthProps) {
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
        {MONTH_NAMES[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map((d) => (
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

function StatusBadge({ status }: { status: Booking["status"] }) {
  const classes = {
    pending: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
    confirmed: "bg-green-500/20 text-green-300 border border-green-500/40",
    declined: "bg-red-500/20 text-red-300 border border-red-500/40",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${classes[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Calendar state
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingAction, setBookingAction] = useState<Record<string, boolean>>({});

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
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) {
      console.error("Failed to load bookings", e);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchBlockedDates();
      fetchBookings();
    }
  }, [authenticated, fetchBlockedDates, fetchBookings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password.");
    }
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
          "x-admin-password": ADMIN_PASSWORD,
        },
        body: JSON.stringify({ blockedDates: Array.from(blockedDates).sort() }),
      });
      if (!res.ok) {
        throw new Error("Failed to save");
      }
      setSaveMessage({ type: "success", text: "Blocked dates saved successfully!" });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setBookingAction((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/bookings/${id}/confirm`, {
        method: "POST",
        headers: { "x-admin-password": ADMIN_PASSWORD },
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

  const handleDecline = async (id: string) => {
    setBookingAction((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/bookings/${id}/decline`, {
        method: "POST",
        headers: { "x-admin-password": ADMIN_PASSWORD },
      });
      if (!res.ok) throw new Error("Failed to decline");
      await fetchBookings();
    } catch (e) {
      console.error("Failed to decline booking", e);
    } finally {
      setBookingAction((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Generate 3 months starting from current month
  const now = new Date();
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center container py-16">
        <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Admin</h1>
          <p className="text-slate-400 text-sm text-center mb-6">Manage blocked dates</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder="Enter admin password"
                autoFocus
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-400">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const otherBookings = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="container py-16">
      <div className="max-w-5xl mx-auto">

        {/* ── Calendar Section ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white">Admin — Blocked Dates</h1>
            <p className="text-slate-400 mt-1">Click a date to block/unblock it. Blocked dates appear in red.</p>
          </div>
          <div className="flex items-center gap-3">
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {loadingDates ? (
          <div className="text-center text-slate-400 py-16">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {months.map(({ year, month }) => (
              <CalendarMonth
                key={`${year}-${month}`}
                year={year}
                month={month}
                blockedDates={blockedDates}
                onToggle={toggleDate}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/80" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-surface-700 border border-white/10" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-surface-900" />
            <span>Past</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {blockedDates.size} date{blockedDates.size !== 1 ? "s" : ""} currently blocked.
        </p>

        {/* ── Bookings Section ── */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white">Bookings</h2>
              <p className="text-slate-400 mt-1">
                {bookings.length} total · {pendingBookings.length} pending
              </p>
            </div>
            <button
              onClick={fetchBookings}
              className="px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-slate-300 rounded-xl transition border border-white/10"
            >
              Refresh
            </button>
          </div>

          {loadingBookings ? (
            <div className="text-center text-slate-400 py-16">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="bg-surface-800 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-lg">No bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending bookings first */}
              {[...pendingBookings, ...otherBookings].map((booking) => (
                <div
                  key={booking.id}
                  className="bg-surface-800 border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white truncate">{booking.name}</h3>
                        <StatusBadge status={booking.status} />
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
                            {booking.checkIn} → {booking.checkOut}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-slate-500">👥</span>
                          <span>{booking.guests} guest{Number(booking.guests) !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {booking.message && (
                        <div className="mt-3 p-3 bg-surface-900 rounded-xl text-sm text-slate-400 border border-white/5">
                          <span className="text-slate-500 text-xs uppercase tracking-wider">Message: </span>
                          {booking.message}
                        </div>
                      )}

                      <p className="mt-3 text-xs text-slate-600">
                        Submitted {new Date(booking.createdAt).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {booking.status === "pending" && (
                      <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirm(booking.id)}
                          disabled={bookingAction[booking.id]}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {bookingAction[booking.id] ? "..." : "✓ Confirm"}
                        </button>
                        <button
                          onClick={() => handleDecline(booking.id)}
                          disabled={bookingAction[booking.id]}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {bookingAction[booking.id] ? "..." : "✗ Decline"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
