"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Remount with the source as key when switching kit images. */
export default function PreviewImage({ src, alt, className, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <>
    {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-black/[0.045] motion-reduce:animate-none" />}
    <Image {...props} src={failed ? "/assets/jersey-placeholder.svg" : src} alt={alt}
      className={`${className ?? ""} transition-opacity duration-300 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setLoaded(true)}
      onError={() => { if (failed) setLoaded(true); else setFailed(true); }} />
  </>;
}
