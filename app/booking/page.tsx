"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useT } from "@/app/components/LangProvider";
import type { PublicStrings } from "@/app/lib/i18n/public";

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

// Month and day names are resolved at render time via useT() so they
// flip with the language picker. The arrays below are EN fallbacks used
// inside non-React helpers; the actual rendered names come from the
// `monthNames` / `dayNames` arrays computed in BookingPage.
const MONTH_KEYS = [
  "booking.calMonthJan", "booking.calMonthFeb", "booking.calMonthMar", "booking.calMonthApr",
  "booking.calMonthMay", "booking.calMonthJun", "booking.calMonthJul", "booking.calMonthAug",
  "booking.calMonthSep", "booking.calMonthOct", "booking.calMonthNov", "booking.calMonthDec",
] as const satisfies readonly (keyof PublicStrings)[];
const DAY_KEYS = [
  "booking.calDayMon", "booking.calDayTue", "booking.calDayWed", "booking.calDayThu",
  "booking.calDayFri", "booking.calDaySat", "booking.calDaySun",
] as const satisfies readonly (keyof PublicStrings)[];

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
  monthNames,
  dayNames,
  tooltips,
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
  monthNames: string[];
  dayNames: string[];
  tooltips: { unavailable: string; minNights: string };
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
        {monthNames[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((d) => (
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
              title={isBlocked ? tooltips.unavailable : tooClose ? tooltips.minNights : undefined}
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
  const t = useT();
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  // Resolve the localised month + day arrays once per render so we don't
  // call t() inside the inner loop. Same idea for tooltips.
  const monthNames = MONTH_KEYS.map((k) => t(k));
  const dayNames = DAY_KEYS.map((k) => t(k));
  const tooltips = { unavailable: t("booking.tooltipUnavailable"), minNights: t("booking.tooltipMinNights") };

  // `todayStr` MUST be computed after hydration. Computing it inline at
  // render time produces wrong markup when /booking is statically
  // prerendered before midnight and served to a client after midnight —
  // the SSR HTML has yesterday's `todayStr` and React's reconciliation
  // skips re-rendering the `disabled` attribute on the boundary cell.
  // The fix: start with empty `todayStr` (matches what the server would
  // produce if no date were available), populate via useEffect after
  // mount, and key the cells by `todayStr` so a change forces a full
  // remount of the calendar grid. See housey#3.
  const [todayStr, setTodayStr] = useState<string>("");
  useEffect(() => {
    const now = new Date();
    setTodayStr(formatDate(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const now = new Date();
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      <div className="text-xs text-slate-400 mb-3 space-y-0.5">
        {!checkIn && <p>{t("booking.clickCheckIn")}</p>}
        {checkIn && !checkOut && <p>{t("booking.clickCheckOut")}</p>}
        {checkIn && checkOut && (
          <p className="text-brand-400">
            ✓ {checkIn} → {checkOut} ({diffDays(checkIn, checkOut)} {t("booking.nightsSuffix")})
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="px-3 py-1.5 rounded bg-surface-800 text-slate-300 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          {t("booking.calPrev")}
        </button>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="px-3 py-1.5 rounded bg-surface-800 text-slate-300 hover:bg-surface-700 text-sm"
        >
          {t("booking.calNext")}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {months.map(({ year, month }) => (
          <CalendarMonth
            // Include todayStr in the key so when it changes (after
            // hydration, or after midnight), React fully remounts the
            // grid instead of attempting to patch the existing one. This
            // is what closes housey#3.
            key={`${year}-${month}-${todayStr}`}
            year={year}
            month={month}
            blockedDates={blockedDates}
            checkIn={checkIn}
            checkOut={checkOut}
            hoveredDate={hoveredDate}
            onSelect={onSelect}
            onHover={setHoveredDate}
            today={todayStr}
            monthNames={monthNames}
            dayNames={dayNames}
            tooltips={tooltips}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-brand-500" />
          <span>{t("booking.legendSelected")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-brand-500/20" />
          <span>{t("booking.legendRange")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-surface-900/50 border border-white/10" />
          <span>{t("booking.legendUnavailable")}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Booking schema (typed shape; messages are language-aware) ----------

type BookingForm = {
  name: string;
  email: string;
  phone: string;
  guests: string;
  message?: string;
};

// ---------- Main page ----------

export default function BookingPage() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");

  // Re-build the schema whenever the language changes so validation
  // messages flip with the picker. RHF/Zod resolvers are pure functions
  // of the schema, so swapping it is fine.
  const bookingSchema = useMemo(() => z.object({
    name:    z.string().min(2, t("booking.errNameMin")),
    email:   z.string().email(t("booking.errEmail")),
    phone:   z.string().min(5, t("booking.errPhoneMin")),
    guests:  z.string().min(1, t("booking.errGuestsReq")),
    message: z.string().optional(),
  }), [t]);

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
      setDateError(t("booking.minStayError"));
      return;
    }

    // Check if any blocked date falls within the range
    let d = addDays(checkIn, 1);
    while (d < date) {
      if (blockedDates.has(d)) {
        setDateError(t("booking.unavailableRangeError"));
        return;
      }
      d = addDays(d, 1);
    }

    setCheckOut(date);
    setDateError("");
  };

  const onSubmit = async (data: BookingForm) => {
    if (!checkIn || !checkOut) {
      setDateError(t("booking.selectDatesError"));
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
      alert(t("booking.failedAlert"));
    }
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{t("booking.title")}</h1>
          <p className="text-slate-300 text-lg">
            {t("booking.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Pricing Info */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("booking.pricingTitle")}</h2>
            <div className="space-y-4 text-slate-300">
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>{t("booking.peakSeason")}</span>
                <span className="text-brand-400 font-semibold">{t("booking.pricingPeakValue")}</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>{t("booking.midSeason")}</span>
                <span className="text-brand-400 font-semibold">{t("booking.pricingMidValue")}</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>{t("booking.lowSeason")}</span>
                <span className="text-brand-400 font-semibold">{t("booking.pricingLowValue")}</span>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <p>{t("booking.minStay")}</p>
              <p>{t("booking.maxCapacity")}</p>
              <p>{t("booking.checkInHours")}</p>
              <p>{t("booking.checkOutHours")}</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("booking.includedTitle")}</h2>
            <ul className="space-y-3 text-slate-300">
              {[
                t("booking.amenityKitchen"),
                t("booking.amenityWifiTv"),
                t("booking.amenityAc"),
                t("booking.amenityParking"),
                t("booking.amenityTerrace"),
                t("booking.amenityBbq"),
                t("booking.amenityBeach"),
                t("booking.amenityLinens"),
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
          <h2 className="text-2xl font-semibold text-white mb-6">{t("booking.reservationRequestTitle")}</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-brand-500/20 border border-brand-400/50 rounded-xl text-brand-300">
              {t("booking.thankYouToast")}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                {t("booking.selectDatesLabel")}
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
                  <span>{t("booking.checkInRow")} <strong className="text-white">{checkIn}</strong></span>
                  <span>{t("booking.checkOutRow")} <strong className="text-white">{checkOut}</strong></span>
                  <span>{t("booking.durationRow")} <strong className="text-brand-400">{diffDays(checkIn, checkOut)} {t("booking.nightsSuffix")}</strong></span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("booking.nameLabel")}
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder={t("booking.placeholderName")}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("booking.emailLabel")}
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder={t("booking.placeholderEmail")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("booking.phoneLabel")}
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder={t("booking.placeholderPhone")}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("booking.guestsLabel")}
                </label>
                <select
                  {...register("guests")}
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                >
                  <option value="">{t("booking.guestSelectPlaceholder")}</option>
                  <option value="1">{t("booking.guest1")}</option>
                  <option value="2">{t("booking.guest2")}</option>
                </select>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-400">{errors.guests.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("booking.messageLabel")}
              </label>
              <textarea
                {...register("message")}
                rows={4}
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder={t("booking.placeholderMessage")}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? t("booking.submitting") : t("booking.submitBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
