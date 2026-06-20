"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ShoppingBag } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-4 md:px-10 bg-background/60 backdrop-blur-xl border-b border-border/30">
      <Link href="/" className="flex items-center gap-3 justify-self-start">
        <Image
          src="/assets/tisa-logo.png"
          alt="TISA logo"
          width={36}
          height={36}
          className="rounded-lg object-cover"
          priority
        />
        <span className="text-lg font-bold tracking-[0.2em] font-display text-primary">TISA</span>
        {/* <span className="bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-mono text-primary">Arena</span> */}
      </Link>

      <nav className="hidden md:flex gap-10 text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium justify-self-center">
        <Link href="/" className="hover:text-primary transition-colors duration-300">Showroom</Link>
        <Link href="/shop" className="hover:text-primary transition-colors duration-300">Roster</Link>
        <Link href="/contact" className="hover:text-primary transition-colors duration-300">Contact</Link>
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        <Link href="/cart" className="relative w-10 h-10 rounded-full border border-border/60 text-muted-foreground hover:border-primary/60 flex items-center justify-center transition-all hover:text-primary">
          <ShoppingBag size={16} />
        </Link>
        <button onClick={() => setOpen(!open)} className="md:hidden w-10 h-10 rounded-full border border-border flex items-center justify-center">
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-6 flex flex-col gap-4 md:hidden">
          <Link href="/" onClick={() => setOpen(false)} className="text-sm tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors">Showroom</Link>
          <Link href="/shop" onClick={() => setOpen(false)} className="text-sm tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors">Roster</Link>
          <Link href="/contact" onClick={() => setOpen(false)} className="text-sm tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors">Contact</Link>
        </div>
      )}
    </header>
  );
}
