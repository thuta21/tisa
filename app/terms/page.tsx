import type { Metadata } from "next";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = { title: "Ordering Terms | TISA", description: "How WhatsApp order enquiries, product availability and sizing work at TISA.", alternates: { canonical: "/terms" } };
const sections = [
  ["WhatsApp enquiries", "Order Now prepares an enquiry for an available TISA WhatsApp number. You must send the message in WhatsApp. Opening WhatsApp does not place a confirmed order, reserve inventory or collect payment."],
  ["Collection information", "Product images, prices and size availability reflect the catalog at the time of viewing and may change. Our team confirms current availability and the final total in your WhatsApp conversation."],
  ["Sizing", "Size charts provide general measurement guidance. Measurements may vary by product, and colors can appear differently on different screens."],
  ["Order confirmation", "Before agreeing to an order or making a payment, confirm delivery charges, payment instructions, customization options and applicable exchange terms with the TISA team in your WhatsApp conversation."],
];
export default function TermsPage() {
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28"><article className="mx-auto max-w-3xl px-5 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ordering terms</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Ordering with TISA.</h1><p className="mt-4 text-sm text-muted-foreground">Last updated 24 October 2026</p><div className="mt-9 divide-y divide-border border-y border-border">{sections.map(([heading, body]) => <section key={heading} className="py-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-3 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div></article></main><Footer /></div>;
}
