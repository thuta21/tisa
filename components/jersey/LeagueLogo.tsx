"use client";

import Image from "next/image";
import { getBundledLeagueLogo, getPublicLeagueLogo } from "@/lib/league-logos";

export default function LeagueLogo({
  logoPath,
  alt,
  sizes,
  className = "object-contain",
  priority = false,
}: {
  logoPath?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const source = getPublicLeagueLogo(logoPath);
  if (!source) return null;

  return (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={(event) => {
        const fallback = getBundledLeagueLogo(logoPath);
        if (fallback && !event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}
