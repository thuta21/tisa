import React from "react";

export default function HangerSVG() {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-20 absolute top-0 left-0 z-20 pointer-events-none drop-shadow-[0_5px_8px_rgba(0,0,0,0.4)]">
      <path d="M 150 50 C 150 20, 175 25, 175 40 C 175 55, 150 55, 150 70" fill="none" stroke="#00F0FF" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 60 100 L 150 70 L 240 100 C 240 100, 150 82, 60 100 Z" fill="#00F0FF" stroke="#00c8d6" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}