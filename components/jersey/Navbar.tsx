"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LogOut, Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/fonts", label: "Name & Number" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { isAuthenticated, isLoadingAuth, logout } = useAuth();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-5 py-3 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex items-center gap-3 justify-self-start" aria-label="TISA home">
          <Image
            src="/assets/tisa-logo.png"
            alt=""
            width={36}
            height={36}
            className="rounded-lg object-cover"
            priority
          />
          <span className="text-lg font-bold tracking-[0.16em] text-primary">TISA</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative py-2 transition-colors ${isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
              {isActive(item.href) && <span className="absolute inset-x-0 -bottom-3 h-0.5 rounded-full bg-primary" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
          {!isLoadingAuth && (isAuthenticated ? (
            <>
              <Link
              href="/account"
              aria-label="My account"
              title="My account"
              className="hidden size-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary sm:flex"
            >
              <CircleUserRound size={18} />
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Log out"
                title="Log out"
                className="hidden size-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary sm:flex"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              aria-label="Log in"
              title="Log in"
              className="hidden size-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary sm:flex"
            >
              <CircleUserRound size={18} />
            </Link>
          ))}
          <Link
            href="/cart"
            aria-label={`Shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative flex size-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ShoppingBag size={17} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-full border border-border md:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-background/95 shadow-lg backdrop-blur-xl md:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${isActive(item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            ))}
            {!isLoadingAuth && (isAuthenticated ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <CircleUserRound size={18} /> My account
                </Link>
                <button
                  type="button"
                  onClick={() => { void logout(); setOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut size={17} /> Log out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <CircleUserRound size={18} /> Log in
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
