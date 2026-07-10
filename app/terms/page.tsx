import type { Metadata } from "next";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = { title: "Storefront Terms | TISA" };

const sections = [
  ["Product information", "TISA aims to show current images, prices, available kit variants and size-level stock. Product colors can vary by screen, and stock can change before checkout completes."],
  ["Order review", "Submitting checkout creates an order request. The order remains subject to stock, delivery and payment review; submission alone does not confirm dispatch or a delivery date."],
  ["Prices and delivery", "Product prices are shown in AED. A delivery fee is not included where checkout says it will be confirmed separately. Any final fee should be confirmed before fulfilment."],
  ["Customization", "Customers are responsible for checking names, numbers, font choices and badges before submitting. Personalized products may have different exchange eligibility, so confirm this before customization if flexibility is important."],
  ["Payments", "Use only the active method and verified instructions associated with the TISA checkout or order confirmation. Do not pay an unverified account, phone number or demo QR."],
  ["Digital products", "Name-and-number font files are digital items. Their permitted use and delivery details should be reviewed before ordering, and redistribution is not granted unless stated."],
  ["Cancellations and exchanges", "Operational cancellation and exchange terms are still being finalized. Contact TISA through a verified published channel before returning an item or assuming an order can be changed."],
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main className="flex-1 pb-16 pt-24 sm:pt-28"><article className="mx-auto w-full max-w-3xl px-5 sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Storefront terms</p><h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">What happens when you order from TISA.</h1><p className="mt-3 text-sm text-muted-foreground">Last updated 10 July 2026 · Operational terms remain subject to business review.</p><div className="mt-9 divide-y divide-border border-y border-border">{sections.map(([heading, body]) => <section key={heading} className="py-6"><h2 className="text-xl font-bold">{heading}</h2><p className="mt-2 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div></article></main><Footer /></div>
  );
}
