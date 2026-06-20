"use client";

import React from "react";
import { motion } from "framer-motion";

export default function PerformanceBar({
  label,
  value,
  delay = 0,
}: {
  label: string;
  value: number;
  delay?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{label}</span>
        <span className="text-[11px] font-mono font-semibold text-primary">{value}/100</span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
          className="h-full bg-primary rounded-full"
        />
      </div>
    </div>
  );
}
