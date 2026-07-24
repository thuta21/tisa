"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Mail, Send, Sparkles } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

const faqItems = [
  {
    id: "question-01",
    question: "Question 01",
    answer: "Answer content will be added here.",
  },
  {
    id: "question-02",
    question: "Question 02",
    answer: "Answer content will be added here.",
  },
  {
    id: "question-03",
    question: "Question 03",
    answer: "Answer content will be added here.",
  },
];

type FormField = "name" | "email" | "message";

export default function Contact() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const updateField = (field: FormField, value: string) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-foreground">
      <Navbar />

      <main className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-12 -z-10 size-[32rem] rounded-full bg-[#E10714]/8 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 bottom-0 -z-10 size-[30rem] rounded-full bg-black/[0.04] blur-3xl"
        />

        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto mb-8 flex max-w-7xl flex-col justify-between gap-5 border-b border-black/10 pb-8 sm:mb-10 sm:flex-row sm:items-end"
        >
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#E10714]">
              <span className="h-px w-8 bg-[#E10714]" />
              TISA support
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-normal tracking-[-0.045em] text-black sm:text-6xl lg:text-7xl">
              Start a conversation<span className="text-[#E10714]">.</span>
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-black/50 sm:text-right">
            Tell us what you need. We&apos;ll keep the next step simple.
          </p>
        </motion.header>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-stretch">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[32px] border border-black/[0.08] bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.08)] sm:p-8 lg:p-10"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border-[34px] border-[#E10714]/5"
            />
            <div className="relative mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E10714]">
                  01 — Message us
                </p>
                <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] text-black sm:text-3xl">
                  How can we help?
                </h2>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E10714] text-white shadow-[0_12px_30px_rgba(225,7,20,0.24)]">
                <Mail className="size-4" />
              </span>
            </div>

            <form onSubmit={handleSubmit} className="relative grid gap-5">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
                  Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoComplete="name"
                  required
                  placeholder="Your name"
                  className="h-14 rounded-2xl border border-black/10 bg-[#f7f6f3] px-4 text-base outline-none transition duration-300 placeholder:text-black/30 hover:border-black/20 focus:-translate-y-0.5 focus:border-[#E10714] focus:bg-white focus:shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus:ring-[#E10714]/8"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-14 rounded-2xl border border-black/10 bg-[#f7f6f3] px-4 text-base outline-none transition duration-300 placeholder:text-black/30 hover:border-black/20 focus:-translate-y-0.5 focus:border-[#E10714] focus:bg-white focus:shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus:ring-[#E10714]/8"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
                  Message
                </span>
                <textarea
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  required
                  rows={7}
                  placeholder="How can we help?"
                  className="resize-none rounded-2xl border border-black/10 bg-[#f7f6f3] px-4 py-4 text-base leading-7 outline-none transition duration-300 placeholder:text-black/30 hover:border-black/20 focus:-translate-y-0.5 focus:border-[#E10714] focus:bg-white focus:shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus:ring-[#E10714]/8"
                />
              </label>

              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="group inline-flex h-14 items-center justify-between gap-8 rounded-full bg-[#E10714] pl-6 pr-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(225,7,20,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c90612] hover:shadow-[0_18px_38px_rgba(225,7,20,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E10714]/20"
                >
                  {submitted ? "Form ready" : "Send message"}
                  <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#E10714] transition-transform duration-300 group-hover:rotate-[-8deg]">
                    {submitted ? <Check className="size-4" /> : <Send className="size-4" />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {submitted ? (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      role="status"
                      className="text-xs leading-5 text-black/45"
                    >
                      Message delivery will be connected later.
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </form>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            className="relative flex min-h-[520px] flex-col overflow-hidden rounded-[32px] bg-[#111111] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:p-8 lg:p-10"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[#E10714]/25 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-4 pb-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff4550]">
                  02 — Quick answers
                </p>
                <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
                  Before you send.
                </h2>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#ff4550] backdrop-blur">
                <Sparkles className="size-4" />
              </span>
            </div>

            <div className="relative border-t border-white/15">
              {faqItems.map((item) => {
                const isOpen = openQuestion === item.id;

                return (
                  <div key={item.id} className="border-b border-white/15">
                    <button
                      type="button"
                      onClick={() => setOpenQuestion(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${item.id}-answer`}
                      className="group flex w-full items-center justify-between gap-5 py-6 text-left"
                    >
                      <span
                        className={`text-base font-medium transition-colors ${
                          isOpen ? "text-[#ff4550]" : "text-white group-hover:text-[#ff4550]"
                        }`}
                      >
                        {item.question}
                      </span>
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition ${
                          isOpen
                            ? "border-[#E10714] bg-[#E10714] text-white"
                            : "border-white/15 bg-white/5 text-white/60 group-hover:border-[#ff4550]/50 group-hover:text-[#ff4550]"
                        }`}
                      >
                        <ChevronDown
                          className={`size-4 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          id={`${item.id}-answer`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-lg pb-6 pr-12 text-sm leading-6 text-white/50">
                            {item.answer}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-auto grid grid-cols-3 gap-2 pt-8">
              {["Sizing", "Orders", "Delivery"].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45"
                >
                  {topic}
                </span>
              ))}
            </div>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
