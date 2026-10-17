"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { LoaderCircle } from "lucide-react";

/** Remount with the source as key when switching kit images. */
export default function PreviewImage({ src, alt, className, loadingLabel, ...props }: ImageProps & { loadingLabel?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <>
    {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-black/[0.045] motion-reduce:animate-none" />}
    {!loaded && loadingLabel && <div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/40 text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-primary motion-reduce:animate-none" />
      <span className="text-sm font-medium">{loadingLabel}</span>
    </div>}
    <Image {...props} src={failed ? "/assets/jersey-placeholder.svg" : src} alt={alt}
      className={`${className ?? ""} transition-opacity duration-300 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setLoaded(true)}
      onError={() => { if (failed) setLoaded(true); else setFailed(true); }} />
  </>;
}
