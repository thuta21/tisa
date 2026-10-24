"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, UserRound } from "lucide-react";
import { useOptionalAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Collection" },
  { href: "/contact", label: "About TISA" },
];

export default function Navbar() {
  const auth = useOptionalAuth();
  const user = auth?.user;
  const isLoadingAuth = auth?.isLoadingAuth ?? true;
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const links = Array.from(menu.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
        if (event.shiftKey && document.activeElement === toggle.current) { event.preventDefault(); links.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); toggle.current?.focus(); }
      }
    };
    const desktop = window.matchMedia?.("(min-width: 768px)");
    const onResize = () => { if (desktop?.matches) setOpen(false); };
    desktop?.addEventListener("change", onResize);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop?.removeEventListener("change", onResize);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <a href="#main-content" className="sr-only rounded-lg bg-background p-3 text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to content</a>
      <div className="mx-auto flex h-[73px] w-full max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label="TISA home" onClick={() => setOpen(false)}>
          <Image src="/assets/tisa-logo.png" alt="" width={36} height={36} className="rounded-lg object-cover" priority />
          <span className="text-base font-semibold tracking-[0.18em] sm:text-lg">TISA</span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map(item => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`inline-flex min-h-11 items-center transition-colors ${isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>{item.label}</Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href={user ? "/account" : `/login?next=${encodeURIComponent(pathname)}`} aria-label={user ? "My account" : "Customer login"} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary"><UserRound size={16} /><span>{isLoadingAuth ? "Account" : user ? "My account" : "Log in"}</span></Link>
          <button ref={toggle} type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" className="grid size-11 place-items-center rounded-full border border-border md:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && <nav ref={menu} id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[calc(100dvh-73px)] overflow-y-auto overscroll-contain border-t border-border bg-background px-4 py-3 shadow-lg md:hidden">{navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`flex min-h-12 items-center rounded-lg px-3 py-3 text-base font-medium ${isActive(item.href) ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</Link>)}</nav>}
    </header>
    {open && <button type="button" tabIndex={-1} aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-x-0 bottom-0 top-[73px] z-40 bg-black/25 md:hidden" />}
  </>;
}
