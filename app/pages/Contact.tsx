import React from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Mail, MessageCircle, Ruler, Truck } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { getWhatsAppSupportUrl, storefrontContact } from "@/lib/storefront";

const helpLinks = [
  { href: "/customer-care#size-guide", icon: Ruler, title: "Fit guide", text: "Measure a shirt and choose the right available size." },
  { href: "/customer-care#delivery", icon: Truck, title: "Delivery & exchanges", text: "See what is confirmed during order review." },
];

export default function Contact() {
  const whatsAppUrl = getWhatsAppSupportUrl();
  const hasContactChannel = Boolean(storefrontContact.email || whatsAppUrl);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pb-14 pt-24 sm:pt-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Contact</p>
            <h1 className="mt-2 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">Get help without guessing who to contact.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Verified support channels appear here only after they are configured. TISA will not present placeholder phone numbers, locations or social accounts as real contact information.
            </p>

            <div className="mt-8 grid gap-3">
              {storefrontContact.email && (
                <a href={`mailto:${storefrontContact.email}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/40">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail size={18} /></span>
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</p><p className="mt-0.5 truncate text-base font-semibold">{storefrontContact.email}</p></div>
                  <ArrowRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
                </a>
              )}
              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/40">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle size={18} /></span>
                  <div className="flex-1"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">WhatsApp</p><p className="mt-0.5 text-base font-semibold">Message TISA</p></div>
                  <ArrowRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
                </a>
              )}
              {!hasContactChannel && (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  <div className="flex gap-3"><CircleAlert size={20} className="mt-0.5 shrink-0" /><div><h2 className="font-semibold">Support channels are being finalized.</h2><p className="mt-1 text-sm leading-6 opacity-80">For now, keep your order reference and do not send payment or personal details to contact information that is not published on this page or in checkout.</p></div></div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/50 p-5 sm:p-7">
            <p className="text-sm font-semibold text-primary">Quick answers</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Check these before you message.</h2>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {helpLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group flex gap-4 py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><item.icon size={17} /></span>
                  <div className="flex-1"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p></div>
                  <ArrowRight size={17} className="mt-3 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
              <Link href="/customer-care#payment" className="group flex gap-4 py-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><CircleAlert size={17} /></span>
                <div className="flex-1"><h3 className="font-semibold">Safe payment information</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Use only an active method and verified instructions shown in the order flow.</p></div>
                <ArrowRight size={17} className="mt-3 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
