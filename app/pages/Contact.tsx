import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

const answers = [
  ["Can I place an order?", "Online ordering is not open yet. This website is a preview of the collection; orders, deposits and payments are not being accepted."],
  ["Where can I check sizing?", "Visit the Fit Guide for measurements. You can also open the size guide from a jersey’s detail page."],
  ["How can I contact TISA?", "Our customer support details will be published here when they are ready. There is no active contact form or WhatsApp ordering channel at this stage."],
];

export default function Contact() {
  return (
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28 sm:pb-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About TISA</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">A first look at what we’re preparing.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">TISA is preparing its football jersey collection. For now, explore kit designs, compare sleeve styles and check the fit guide.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <Link href="/shop" className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-border bg-white/75 p-6 text-lg font-medium hover:border-primary/40">Explore the collection <ArrowUpRight className="shrink-0 text-primary" size={22} /></Link>
            <Link href="/customer-care#size-guide" className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-border bg-white/75 p-6 text-lg font-medium hover:border-primary/40">Read the fit guide <ArrowUpRight className="shrink-0 text-primary" size={22} /></Link>
          </div>
          <section className="mt-12 rounded-[28px] bg-[#111111] p-6 text-white sm:p-9">
            <h2 className="text-2xl font-semibold tracking-tight">Before launch</h2>
            <div className="mt-5 divide-y divide-white/15">{answers.map(([question, answer]) => <div key={question} className="py-5"><h3 className="font-medium">{question}</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-white/65">{answer}</p></div>)}</div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
