"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";

export default function Cart() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={28} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">Your Kit Bag</h1>
          <p className="text-muted-foreground text-sm font-body mb-8">
            Your cart is empty. Browse the showroom or roster to find your next match-day kit.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 border border-border text-sm font-mono uppercase tracking-widest rounded-full hover:border-primary hover:text-primary transition-all"
            >
              Showroom
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 bg-primary text-primary-foreground text-sm font-mono uppercase tracking-widest rounded-full hover:bg-primary/90 transition-all"
            >
              Browse Roster
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
