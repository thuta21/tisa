import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export default function LaunchNotice() {
  return (
    <div className="tisa-page-surface flex min-h-screen flex-col text-foreground">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="grid flex-1 place-items-center px-5 pb-16 pt-28 sm:px-6">
        <section className="w-full max-w-2xl rounded-[28px] border border-border bg-white/85 p-7 text-center shadow-sm sm:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/5 text-primary"><Eye size={24} /></span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">TISA collection preview</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Online ordering is not open yet.</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground">Explore the collection while we prepare for launch. Checkout, customer accounts and payments are currently unavailable.</p>
          <Link href="/shop" className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Explore the collection <ArrowRight size={17} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
