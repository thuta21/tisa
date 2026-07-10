import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, PackageCheck, Ruler, Truck } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = {
  title: "Customer Care | TISA",
  description: "Fit, delivery, exchange and payment information for TISA orders.",
};

const sections = [
  {
    id: "size-guide",
    icon: Ruler,
    eyebrow: "Fit guide",
    title: "Use the Player Version size chart.",
    body: "The product size guide lists length, chest width, suggested height and suggested weight. Open Size guide from any jersey page to see the full chart alongside the sizes currently in stock.",
    notes: [
      "Chest and length are measured in centimetres; manual measurements can vary by 1–3 cm.",
      "For a slim fit, consider one size down; for a loose fit, consider one size up.",
      "Available sizes are shown separately for each Home, Away and Third kit.",
    ],
  },
  {
    id: "delivery",
    icon: Truck,
    eyebrow: "Delivery",
    title: "Delivery details are reviewed with your order.",
    body: "The current checkout accepts UAE addresses. Delivery fees and timing are confirmed after the order is reviewed, before fulfilment proceeds.",
    notes: [
      "Provide a complete building, street and emirate in checkout.",
      "If timing is important, wait for confirmation before relying on a delivery date.",
      "Your checkout subtotal does not include an unconfirmed delivery fee.",
    ],
  },
  {
    id: "exchanges",
    icon: PackageCheck,
    eyebrow: "Exchanges",
    title: "Confirm exchange eligibility before customizing.",
    body: "A formal exchange window is not published yet. Keep the item unworn and retain the original packaging while your request is reviewed. Do not assume a personalized shirt can be exchanged.",
    notes: [
      "Check the selected kit, size, name, number and badge before placing the order.",
      "Report a wrong or damaged item as soon as a verified support channel is available.",
      "TISA will publish a complete exchange policy when the operational terms are finalized.",
    ],
  },
  {
    id: "payment",
    icon: CreditCard,
    eyebrow: "Payment",
    title: "Use only the payment method shown in checkout.",
    body: "Checkout records your preferred active payment method. No demo QR or unverified merchant number should be used. Payment or delivery instructions are confirmed during order review.",
    notes: [
      "Do not send funds to a phone number or account that is not shown in an official TISA order confirmation.",
      "Your order can remain awaiting payment while the details are reviewed.",
      "Keep your order reference for follow-up.",
    ],
  },
];

export default function CustomerCarePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pb-16 pt-24 sm:pt-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          <div className="max-w-3xl border-b border-border pb-9">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Customer care</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Order with the facts in front of you.</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">Fit, delivery, exchange and payment guidance based on the storefront’s current ordering flow.</p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 rounded-2xl border border-border bg-card/50 p-5 sm:p-7">
                <div className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><section.icon size={19} /></span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section.eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">{section.title}</h2>
                  </div>
                </div>
                <p className="mt-5 text-base leading-7 text-muted-foreground">{section.body}</p>
                <ul className="mt-5 space-y-3 border-t border-border pt-5">
                  {section.notes.map((note) => <li key={note} className="flex gap-3 text-sm leading-6"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{note}</li>)}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:p-8">
            <div><h2 className="text-2xl font-bold">Ready to choose a kit?</h2><p className="mt-1 text-sm opacity-75">Stock and available sizes are shown on every product.</p></div>
            <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-full bg-primary-foreground px-5 text-sm font-semibold text-primary">Shop jerseys</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
