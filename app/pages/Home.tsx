"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import Carousel3D from "@/components/jersey/Carousel3D";
import { getFeaturedJerseys } from "@/lib/jerseys";

const particles = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  x: (index * 73) % 1200,
  y: (index * 149) % 800,
  driftA: -80 - ((index * 17) % 120),
  driftB: 70 + ((index * 23) % 130),
  duration: 6 + (index % 6),
  delay: (index % 5) * 0.8,
}));

export default function Home() {
  const router = useRouter();
  const jerseys = useMemo(() => getFeaturedJerseys(), []);
  const loading = false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      {/* Hero / Arena */}
      <main className="relative flex-1 flex flex-col justify-start items-center pt-18 pb-3 overflow-hidden md:pt-20 md:pb-5">
        {/* Ambient particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-0.5 h-0.5 rounded-full bg-primary/30"
              initial={{
                x: particle.x,
                y: particle.y,
              }}
              animate={{
                y: [null, particle.driftA, particle.driftB],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
              }}
            />
          ))}
        </div>

        {jerseys.length > 0 ? (
          <Carousel3D
            jerseys={jerseys}
            onSelect={(jersey) => router.push(`/jersey/${jersey.id}`)}
          />
        ) : (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-mono text-sm">No jerseys available yet.</p>
          </div>
        )}
      </main>

      {/* Feature bar */}
      <div className="border-t border-border/20 bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Authentic Kits", value: "100%" },
            { label: "Nationwide Delivery", value: "MM" },
            { label: "Mobile Wallet", value: "K/W" },
            { label: "Sizing Support", value: "DIRECT" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <span className="text-lg font-bold text-primary font-mono">{item.value}</span>
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-mono mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
