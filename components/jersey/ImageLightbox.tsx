"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import PreviewImage from "@/components/jersey/PreviewImage";

export default function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    element.scrollLeft = zoomed ? (element.scrollWidth - element.clientWidth) / 2 : 0;
    element.scrollTop = zoomed ? (element.scrollHeight - element.clientHeight) / 2 : 0;
  }, [zoomed]);
  return <dialog ref={dialog} aria-label="Enlarged jersey image" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-hidden rounded-none border-0 sm:h-auto sm:max-h-[94dvh] sm:w-[92vw] sm:max-w-6xl sm:rounded-2xl sm:border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70">
    <div className="flex min-h-17 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <p className="min-w-0 line-clamp-2 text-xs font-medium sm:text-sm">{alt}</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" aria-label={zoomed ? "Zoom out" : "Zoom in"} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)} className="grid size-11 place-items-center rounded-full border border-border hover:bg-muted">{zoomed ? <ZoomOut size={19} /> : <ZoomIn size={19} />}</button>
        <button type="button" autoFocus onClick={onClose} aria-label="Close enlarged image" className="grid size-11 place-items-center rounded-full border border-border hover:bg-muted"><X size={19} /></button>
      </div>
    </div>
    <div ref={viewport} className="h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] overflow-auto sm:h-[70dvh] overscroll-contain bg-[#eeece7]" tabIndex={0} aria-label="Jersey image. Scroll to explore when zoomed.">
      <div className={`relative ${zoomed ? "h-[140dvh] w-[200%]" : "h-full w-full"}`}>
        <PreviewImage key={src} src={src} alt={alt} fill sizes={zoomed ? "200vw" : "100vw"} loadingLabel="Loading enlarged image…" className="object-contain p-3 sm:p-6" />
      </div>
    </div>
    <p className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground">{zoomed ? "Scroll to explore details. Use Zoom out to see the whole jersey." : "Use Zoom in for a closer look."}</p>
  </dialog>;
}
