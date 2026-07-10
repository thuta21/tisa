import type { Metadata } from "next";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = { title: "Privacy | TISA" };

const sections = [
  ["Information used for orders", "When you check out, TISA collects the name, phone number, optional email, UAE delivery address, order details and customer note you provide. Payment-related records can include the selected payment method and an order or transaction reference."],
  ["How information is used", "This information is used to review orders, manage stock, arrange fulfilment, verify payment status, provide order updates and handle support requests."],
  ["Cart storage", "Your shopping bag is stored in your browser’s local storage so it remains available when you return on the same device. Clearing site data removes that local copy."],
  ["Service providers", "The storefront uses Supabase for application data and storage. Information may also be processed by delivery or payment providers when required to fulfil an order."],
  ["Retention and choices", "Order records are kept only as long as needed for operations, accounting, dispute handling and applicable obligations. Verified support contact details will be published on the Contact page for access, correction or deletion requests."],
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="Privacy" title="How TISA handles storefront information." sections={sections} />;
}

function LegalPage({ eyebrow, title, sections }: { eyebrow: string; title: string; sections: string[][] }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main className="flex-1 pb-16 pt-24 sm:pt-28"><article className="mx-auto w-full max-w-3xl px-5 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 text-sm text-muted-foreground">Last updated 10 July 2026</p><div className="mt-9 divide-y divide-border border-y border-border">{sections.map(([heading, body]) => <section key={heading} className="py-6"><h2 className="text-xl font-bold">{heading}</h2><p className="mt-2 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div></article></main><Footer /></div>
  );
}
