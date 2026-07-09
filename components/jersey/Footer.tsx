"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-30 px-6 py-8 md:px-12 border-t border-border/30 bg-card/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/assets/tisa-logo.png"
            alt="TISA logo"
            width={28}
            height={28}
            className="rounded-md object-cover"
          />
          <span className="text-sm font-bold tracking-[0.2em] font-display text-primary">TISA</span>
          <span className="text-[10px] text-muted-foreground font-mono">© 2026</span>
        </div>
        <nav className="flex gap-8 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-mono">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <Link href="/pricelists" className="hover:text-primary transition-colors">Pricelists</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter</a>
        </nav>
      </div>
    </footer>
  );
}
