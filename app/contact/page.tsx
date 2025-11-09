"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactForm) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
      reset();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert('Failed to send message. Please try again or email us directly.');
    }
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-slate-300 text-lg">
            Have questions? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Get in Touch</h2>
            <div className="space-y-4 text-slate-300">
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">Address</h3>
                <p>Tankaraca 14a</p>
                <p>Vela Luka, Korčula</p>
                <p>Croatia</p>
                <p className="text-sm text-slate-400 mt-2">GPS: 42.9604° N, 16.7147° E</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Tankaraca+14a+Vela+Luka+Korcula+Croatia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-brand-400 hover:text-brand-300 transition text-sm"
                >
                  📍 View on Map →
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">Email</h3>
                <a href="mailto:tankaraca14a@gmail.com" className="hover:text-brand-400 transition">
                  tankaraca14a@gmail.com
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">Phone</h3>
                <a href="tel:+385912055969" className="hover:text-brand-400 transition">
                  +385 91 2055969
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">Response Time</h3>
                <p>We typically respond within 24 hours</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Office Hours</h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>Monday - Friday</span>
                <span className="text-brand-400">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="text-brand-400">10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="text-slate-500">Closed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Send us a Message</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-brand-500/20 border border-brand-400/50 rounded-xl text-brand-300">
              Thank you for your message! We&apos;ll get back to you soon.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="Your name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Subject *
              </label>
              <input
                {...register("subject")}
                type="text"
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder="What is your inquiry about?"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-400">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message *
              </label>
              <textarea
                {...register("message")}
                rows={6}
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder="Your message..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-400">{errors.message.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
