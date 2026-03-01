"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ---------- helpers ----------

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function isBetween(date: string, start: string, end: string): boolean {
  return date > start && date < end;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- Calendar component ----------

interface CalendarPickerProps {
  blockedDates: Set<string>;
  checkIn: string | null;
  checkOut: string | null;
  onSelect: (date: string) => void;
}

function CalendarMonth({
  year,
  month,
  blockedDates,
  checkIn,
  checkOut,
  hoveredDate,
  onSelect,
  onHover,
  today,
}: {
  year: number;
  month: number;
  blockedDates: Set<string>;
  checkIn: string | null;
  checkOut: string | null;
  hoveredDate: string | null;
  onSelect: (date: string) => void;
  onHover: (date: string | null) => void;
  today: string;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Determine effective end for range highlight (use hovered when only checkIn selected)
  const rangeEnd = checkOut ?? (checkIn && hoveredDate && hoveredDate > checkIn ? hoveredDate : null);

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-base font-semibold text-white mb-3 text-center">
        {MONTH_NAMES[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = formatDate(year, month, day);
          const isPast = dateStr < today;
          const isBlocked = blockedDates.has(dateStr);
          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const inRange =
            checkIn && rangeEnd
              ? isBetween(dateStr, checkIn, rangeEnd)
              : false;

          // Determine if this date is within a valid selectable window
          // (i.e., more than 5 nights from checkIn if checkIn is selected and no checkOut yet)
          let tooClose = false;
          if (checkIn && !checkOut) {
            tooClose = dateStr > checkIn && diffDays(checkIn, dateStr) < 5;
          }

          const disabled = isPast || isBlocked || tooClose;

          let cellClass =
            "relative aspect-square flex items-center justify-center text-sm transition-all select-none ";

          if (isPast) {
            cellClass += "text-slate-700 cursor-not-allowed";
          } else if (isBlocked) {
            cellClass +=
              "text-slate-600 line-through cursor-not-allowed bg-surface-900/50 rounded-lg";
          } else if (tooClose) {
            cellClass += "text-slate-600 cursor-not-allowed";
          } else if (isCheckIn || isCheckOut) {
            cellClass +=
              "bg-brand-500 text-white font-bold rounded-lg cursor-pointer z-10";
          } else if (inRange) {
            cellClass += "bg-brand-500/20 text-brand-300 cursor-pointer";
          } else {
            cellClass +=
              "text-slate-200 hover:bg-brand-500/30 hover:text-brand-300 rounded-lg cursor-pointer";
          }

          return (
            <button
              key={dateStr}
              onClick={() => !disabled && onSelect(dateStr)}
              onMouseEnter={() => !disabled && onHover(dateStr)}
              onMouseLeave={() => onHover(null)}
              disabled={disabled}
              className={cellClass}
              title={isBlocked ? "Unavailable" : tooClose ? "Min. 5 nights" : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPicker({ blockedDates, checkIn, checkOut, onSelect }: CalendarPickerProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const now = new Date();
  const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate());

  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      <div className="text-xs text-slate-400 mb-3 space-y-0.5">
        {!checkIn && <p>👆 Click a date to select check-in</p>}
        {checkIn && !checkOut && <p>👆 Now select check-out (min. 5 nights)</p>}
        {checkIn && checkOut && (
          <p className="text-brand-400">
            ✓ {checkIn} → {checkOut} ({diffDays(checkIn, checkOut)} nights)
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {months.map(({ year, month }) => (
          <CalendarMonth
            key={`${year}-${month}`}
            year={year}
            month={month}
            blockedDates={blockedDates}
            checkIn={checkIn}
            checkOut={checkOut}
            hoveredDate={hoveredDate}
            onSelect={onSelect}
            onHover={setHoveredDate}
            today={todayStr}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-brand-500" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-brand-500/20" />
          <span>Range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-surface-900/50 border border-white/10" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Booking schema ----------

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  guests: z.string().min(1, "Number of guests is required"),
  message: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

// ---------- Main page ----------

export default function BookingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  useEffect(() => {
    fetch("/api/admin/blocked-dates")
      .then((r) => r.json())
      .then((data) => setBlockedDates(new Set(data.blockedDates || [])))
      .catch(console.error);
  }, []);

  const handleDateSelect = (date: string) => {
    // If no checkIn, or both already selected → reset to new checkIn
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
      setDateError("");
      return;
    }

    // checkIn selected, no checkOut yet
    if (date <= checkIn) {
      // Clicked same or earlier — reset
      setCheckIn(date);
      setCheckOut(null);
      setDateError("");
      return;
    }

    const nights = diffDays(checkIn, date);
    if (nights < 5) {
      setDateError("Minimum stay is 5 nights.");
      return;
    }

    // Check if any blocked date falls within the range
    let d = addDays(checkIn, 1);
    while (d < date) {
      if (blockedDates.has(d)) {
        setDateError("Your selected range includes unavailable dates. Please choose different dates.");
        return;
      }
      d = addDays(d, 1);
    }

    setCheckOut(date);
    setDateError("");
  };

  const onSubmit = async (data: BookingForm) => {
    if (!checkIn || !checkOut) {
      setDateError("Please select check-in and check-out dates.");
      return;
    }

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          checkIn,
          checkOut,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send booking request");
      }

      setSubmitted(true);
      reset();
      setCheckIn(null);
      setCheckOut(null);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to send booking request. Please try again or contact us directly.");
    }
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Book Your Stay</h1>
          <p className="text-slate-300 text-lg">
            Fill out the form below and we&apos;ll get back to you shortly to confirm your reservation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Pricing Info */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Pricing & Details</h2>
            <div className="space-y-4 text-slate-300">
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>Peak Season (Jun-Sep)</span>
                <span className="text-brand-400 font-semibold">€270/night</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>Mid Season (Apr-May, Oct)</span>
                <span className="text-brand-400 font-semibold">€220/night</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>Low Season (Nov-Mar)</span>
                <span className="text-brand-400 font-semibold">€180/night</span>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <p>✓ Minimum stay: 5 nights</p>
              <p>✓ Maximum capacity: 2 guests</p>
              <p>✓ Check-in: 4:00 PM</p>
              <p>✓ Check-out: 10:00 AM</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">What&apos;s Included</h2>
            <ul className="space-y-3 text-slate-300">
              {[
                "Fully equipped kitchen",
                "WiFi & TV",
                "Air conditioning",
                "Private parking",
                "Outdoor terrace",
                "BBQ grill",
                "Beach access",
                "Linens & towels",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-brand-400">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Booking Form */}
        <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Reservation Request</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-brand-500/20 border border-brand-400/50 rounded-xl text-brand-300">
              Thank you! We&apos;ve received your booking request and will contact you soon.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Select Dates *
              </label>
              <div className="bg-surface-900 border border-white/10 rounded-xl p-4 overflow-x-auto">
                <CalendarPicker
                  blockedDates={blockedDates}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onSelect={handleDateSelect}
                />
              </div>
              {dateError && (
                <p className="mt-2 text-sm text-red-400">{dateError}</p>
              )}
              {checkIn && checkOut && (
                <div className="mt-2 flex gap-6 text-sm text-slate-400">
                  <span>Check-in: <strong className="text-white">{checkIn}</strong></span>
                  <span>Check-out: <strong className="text-white">{checkOut}</strong></span>
                  <span>Duration: <strong className="text-brand-400">{diffDays(checkIn, checkOut)} nights</strong></span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name *
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="+1 234 567 890"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Guests *
                </label>
                <select
                  {...register("guests")}
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                >
                  <option value="">Select...</option>
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                </select>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-400">{errors.guests.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                {...register("message")}
                rows={4}
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder="Any special requests or questions?"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Booking Request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
