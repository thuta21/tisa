import React from "react";
import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/customer-care#size-guide", label: "Fit Guide" },
  { href: "/customer-care#delivery", label: "Delivery & Exchanges" },
  { href: "/customer-care#payment", label: "Payment Information" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function Footer() {
  return (
    <footer className="relative z-30 border-t border-border/60 bg-card/60 py-9">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="TISA home">
            <Image src="/assets/tisa-logo.png" alt="" width={30} height={30} className="rounded-md object-cover" />
            <span className="text-sm font-bold tracking-[0.16em] text-primary">TISA</span>
          </Link>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:max-w-none sm:whitespace-nowrap">
            Match-day kits with clear stock, sizing and order-review information.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">© 2026 TISA</p>
        </div>
        <nav aria-label="Footer navigation" className="flex max-w-2xl flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground md:justify-end">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
