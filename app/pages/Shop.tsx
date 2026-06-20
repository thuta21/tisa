"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { jerseys } from "@/lib/jerseys";

export default function Shop() {
  const loading = false;
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const categories = ["All", ...new Set(jerseys.map((j) => j.category).filter(Boolean))];

  const filtered = jerseys.filter((j) => {
    const matchCategory = filter === "All" || j.category === filter;
    const matchSearch = !search || j.name?.toLowerCase().includes(search.toLowerCase()) || j.team?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight">The Roster</h1>
            <p className="text-muted-foreground mt-2 font-body">Browse the complete collection of premium match-day kits.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jerseys..."
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-full text-sm font-mono focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((l) => (
                <button
                  key={l}
                  onClick={() => setFilter(l)}
                  className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.12em] font-mono border transition-all ${
                    filter === l
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-muted-foreground font-mono text-sm">No jerseys found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((jersey, i) => (
                <motion.div
                  key={jersey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link href={`/jersey/${jersey.id}`} className="group block">
                    <div
                      className="relative border border-border rounded-2xl overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                      style={{
                        background: `linear-gradient(145deg, ${jersey.country_colors[0]}20, var(--card) 46%, ${(jersey.country_colors[2] ?? jersey.country_colors[1])}18)`,
                      }}
                    >
                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl"
                        style={{
                          background: `radial-gradient(circle at center, ${jersey.accent_color || "#00F0FF"}, transparent 70%)`,
                        }}
                      />

                      {/* Image */}
                      <div className="relative aspect-[3/4] p-6 flex items-center justify-center overflow-hidden">
                        {/* Grid pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="w-full h-full" style={{
                            backgroundImage: "linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)",
                            backgroundSize: "40px 40px"
                          }} />
                        </div>
                        <Image
                          src={jersey.image_front}
                          alt={jersey.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="relative z-10 object-contain transition-transform duration-500 group-hover:scale-110"
                          style={{ filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.4))" }}
                        />
                      </div>

                      {/* Info */}
                      <div className="p-5 border-t border-border/30">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-mono mb-1">{jersey.category}</p>
                        <h3 className="font-bold font-display text-sm mb-1 group-hover:text-primary transition-colors">{jersey.name}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs font-mono">{jersey.team}</span>
                          <span className="text-primary font-bold font-display">${jersey.price?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
