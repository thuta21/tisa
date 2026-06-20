"use client";

import React, { useState } from "react";
import { Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

const contactMethods = [
  {
    icon: Mail,
    label: "Email",
    value: "support@tisa.store",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+95 9 000 000 000",
  },
  {
    icon: MapPin,
    label: "Showroom",
    value: "Yangon, Myanmar",
  },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between gap-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                Contact
              </p>
              <h1 className="mt-3 max-w-lg text-4xl font-bold tracking-tight md:text-5xl">
                Talk to TISA about kits, sizing, and orders.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                Send us your question and the team will follow up. The form is local for now and ready for API integration later.
              </p>
            </div>

            <div className="grid gap-3">
              {contactMethods.map((method) => (
                <div
                  key={method.label}
                  className="flex items-center gap-4 rounded-lg border border-border/70 px-4 py-3"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-primary">
                    <method.icon size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {method.label}
                    </p>
                    <p className="text-sm font-semibold">{method.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card/40 p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageSquare size={17} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Message Us</h2>
                <p className="text-xs text-muted-foreground">API မချိတ်သေးလို့ submit state ပဲပြထားပါတယ်။</p>
              </div>
            </div>

            {submitted ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Send size={18} />
                </div>
                <h3 className="text-xl font-bold">Message ready</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Your message flow is working locally. Backend submission can be connected when the API is ready.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 rounded-full border border-border px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitted(true);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Name
                    <input
                      required
                      className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Email
                    <input
                      required
                      type="email"
                      className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary"
                      placeholder="you@example.com"
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Topic
                  <select className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary">
                    <option>Kit order</option>
                    <option>Sizing</option>
                    <option>Shipping</option>
                    <option>Partnership</option>
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Message
                  <textarea
                    required
                    rows={7}
                    className="resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal outline-none focus:border-primary"
                    placeholder="Tell us what you need..."
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.98]"
                >
                  Send Message
                  <Send size={14} />
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
