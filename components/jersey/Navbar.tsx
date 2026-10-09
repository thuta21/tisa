"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Collection" },
  { href: "/contact", label: "About TISA" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <a href="#main-content" className="sr-only rounded-lg bg-background p-3 text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to content</a>
      <div className="mx-auto flex h-[73px] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="TISA home" onClick={() => setOpen(false)}>
          <Image src="/assets/tisa-logo.png" alt="" width={36} height={36} className="rounded-lg object-cover" priority />
          <span className="text-lg font-semibold tracking-[0.18em] text-primary">TISA</span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`py-2 transition-colors ${isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/launch" className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">Collection preview</Link>
          <button type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" className="grid size-11 place-items-center rounded-full border border-border md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-border bg-background px-5 py-3 shadow-lg md:hidden">{navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`block rounded-lg px-3 py-3 text-base font-medium ${isActive(item.href) ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</Link>)}</nav>}
    </header>
  );
}
