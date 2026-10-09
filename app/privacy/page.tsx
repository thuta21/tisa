import type { Metadata } from "next";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = { title: "Privacy | TISA" };
const sections = [
  ["Collection preview", "Customer registration, checkout and payments are currently unavailable. This preview does not provide a contact submission form."],
  ["Technical information", "The website and its hosting services process technical requests needed to deliver pages and images. Supabase provides collection data and authentication for the private admin area."],
  ["Browser storage", "The private admin area uses authentication cookies and browser storage to maintain a session. A shopping bag saved during an earlier version may remain on your device; you can remove it by clearing this website’s browser data."],
  ["Contact and future updates", "Verified contact details will be published on the About TISA page when available. Before customer accounts or ordering open, this notice will be updated to describe the information collected and how it is used."],
];
export default function PrivacyPage() {
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28"><article className="mx-auto max-w-3xl px-5 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Privacy</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your visit to the TISA preview.</h1><p className="mt-4 text-sm text-muted-foreground">Last updated 8 October 2026</p><div className="mt-9 divide-y divide-border border-y border-border">{sections.map(([heading, body]) => <section key={heading} className="py-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-3 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div></article></main><Footer /></div>;
}
