import React from "react";
import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/shop", label: "Collection" },
  { href: "/customer-care#size-guide", label: "Fit Guide" },
  { href: "/contact", label: "About TISA" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function Footer() {
  return (
    <footer className="relative z-30 border-t border-border/60 bg-card/60 py-9">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="TISA home">
            <Image src="/assets/tisa-logo.png" alt="" width={30} height={30} className="rounded-md object-cover" />
            <span className="text-sm font-semibold tracking-[0.18em] text-primary">TISA</span>
          </Link>
          <p className="mt-3 text-sm leading-6 text-muted-foreground max-w-md">
            Football jerseys for your team. Choose your kit and size, then order with TISA on WhatsApp.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">© 2026 TISA</p>
        </div>
        <nav aria-label="Footer navigation" className="grid max-w-2xl grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:flex-wrap text-sm text-muted-foreground md:justify-end">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
