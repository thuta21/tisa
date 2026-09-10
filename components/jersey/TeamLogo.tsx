"use client";

import Image from "next/image";
import { getBundledTeamLogo, getPublicTeamLogo } from "@/lib/team-logos";

export default function TeamLogo({
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
  const source = getPublicTeamLogo(logoPath);
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
        const fallback = getBundledTeamLogo(logoPath);
        if (fallback && !event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}
