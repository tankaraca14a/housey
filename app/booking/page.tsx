"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is required"),
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  guests: z.string().min(1, "Number of guests is required"),
  message: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function BookingPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingForm) => {
    try {
      // Here you would normally send the data to your backend
      console.log("Booking data:", data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitted(true);
      reset();

      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
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
                <span className="text-brand-400 font-semibold">€150/night</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>Mid Season (Apr-May, Oct)</span>
                <span className="text-brand-400 font-semibold">€100/night</span>
              </div>
              <div className="flex justify-between pb-4 border-b border-white/10">
                <span>Low Season (Nov-Mar)</span>
                <span className="text-brand-400 font-semibold">€70/night</span>
              </div>
            </div>

            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <p>✓ Minimum stay: 3 nights</p>
              <p>✓ Maximum capacity: 6 guests</p>
              <p>✓ Check-in: 3:00 PM</p>
              <p>✓ Check-out: 11:00 AM</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">What&apos;s Included</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Fully equipped kitchen
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> WiFi & TV
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Air conditioning
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Private parking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Outdoor terrace
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> BBQ grill
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Beach access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-400">✓</span> Linens & towels
              </li>
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
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                  <option value="5">5 guests</option>
                  <option value="6">6 guests</option>
                </select>
                {errors.guests && (
                  <p className="mt-1 text-sm text-red-400">{errors.guests.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Check-in Date *
                </label>
                <input
                  {...register("checkIn")}
                  type="date"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                />
                {errors.checkIn && (
                  <p className="mt-1 text-sm text-red-400">{errors.checkIn.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Check-out Date *
                </label>
                <input
                  {...register("checkOut")}
                  type="date"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                />
                {errors.checkOut && (
                  <p className="mt-1 text-sm text-red-400">{errors.checkOut.message}</p>
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
