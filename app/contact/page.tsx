"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SocialLinks from "@/app/components/SocialLinks";
import { useT } from "@/app/components/LangProvider";

// Wrapper that renders the "Follow us" block only when at least one social
// URL is configured. Keeps the contact page tidy in the URL-less default.
function SocialOnContact({ label }: { label: string }) {
  return (
    <div data-testid="contact-social-block">
      <h3 className="text-brand-400 font-semibold mb-2">{label}</h3>
      <SocialLinks variant="contact" />
    </div>
  );
}

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);

  // Validation messages flip with the language picker. useMemo so RHF gets
  // a stable resolver per language and not a fresh one every keystroke.
  const contactSchema = useMemo(() => z.object({
    name:    z.string().min(2, t("contact.errNameMin")),
    email:   z.string().email(t("contact.errEmail")),
    subject: z.string().min(1, t("contact.errSubjectReq")),
    message: z.string().min(10, t("contact.errMessageMin")),
  }), [t]);

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
      alert(t("contact.alertFailed"));
    }
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{t("contact.title")}</h1>
          <p className="text-slate-300 text-lg">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("contact.getInTouch")}</h2>
            <div className="space-y-4 text-slate-300">
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">{t("contact.address")}</h3>
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
                  {t("contact.viewOnMap")}
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">{t("contact.emailLabel")}</h3>
                <a href="mailto:tankaraca14a@gmail.com" className="hover:text-brand-400 transition">
                  tankaraca14a@gmail.com
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">{t("contact.phoneLabel")}</h3>
                <a href="tel:+385912055969" className="hover:text-brand-400 transition">
                  +385 91 2055969
                </a>
              </div>
              <div>
                <h3 className="text-brand-400 font-semibold mb-1">{t("contact.responseTime")}</h3>
                <p>{t("contact.responseTimeValue")}</p>
              </div>
              <SocialOnContact label={t("contact.followUs")} />
            </div>
          </div>

          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">{t("contact.officeHours")}</h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>{t("contact.weekdaysLabel")}</span>
                <span className="text-brand-400">{t("contact.weekdaysHours")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("contact.saturdayLabel")}</span>
                <span className="text-brand-400">{t("contact.saturdayHours")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("contact.sundayLabel")}</span>
                <span className="text-slate-500">{t("contact.closed")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-800 border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">{t("contact.sendMessage")}</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-brand-500/20 border border-brand-400/50 rounded-xl text-brand-300">
              {t("contact.thankYou")}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("contact.nameLabel")}
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder={t("contact.placeholderName")}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("contact.contactEmailLabel")}
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                  placeholder={t("contact.placeholderEmail")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("contact.subjectLabel")}
              </label>
              <input
                {...register("subject")}
                type="text"
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder={t("contact.placeholderSubject")}
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-400">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("contact.messageLabel")}
              </label>
              <textarea
                {...register("message")}
                rows={6}
                className="w-full px-4 py-3 bg-surface-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-400 transition"
                placeholder={t("contact.placeholderMessage")}
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
              {isSubmitting ? t("contact.sending") : t("contact.sendBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
