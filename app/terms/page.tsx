import type { Metadata } from "next";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export const metadata: Metadata = { title: "Preview Terms | TISA" };
const sections = [
  ["Preview only", "This website provides a first look at the TISA collection. Online ordering is not open, and the preview does not accept orders, deposits or payments."],
  ["Collection information", "Images, designs and product details may change before launch. Displayed jerseys are a collection preview and do not guarantee availability for purchase."],
  ["Sizing", "Size charts provide general measurement guidance. Measurements may vary by product, and colors can appear differently on different screens."],
  ["Before launch", "Pricing, delivery, payment, customization and exchange terms will be published before online ordering opens. No launch date is confirmed."],
];
export default function TermsPage() {
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main id="main-content" tabIndex={-1} className="flex-1 pb-16 pt-28"><article className="mx-auto max-w-3xl px-5 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Preview terms</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">About this collection preview.</h1><p className="mt-4 text-sm text-muted-foreground">Last updated 8 October 2026</p><div className="mt-9 divide-y divide-border border-y border-border">{sections.map(([heading, body]) => <section key={heading} className="py-6"><h2 className="text-xl font-semibold">{heading}</h2><p className="mt-3 text-base leading-7 text-muted-foreground">{body}</p></section>)}</div></article></main><Footer /></div>;
}
