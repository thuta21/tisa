"use client";
import { useEffect, useRef } from "react";

export default function AdminDialog({ children, label, onClose, busy = false, className = "" }: {
  children: React.ReactNode; label: string; onClose: () => void; busy?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const comboboxEscape = useRef<KeyboardEvent | null>(null);
  const close = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { close.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? [])
      .filter(element => !element.closest('[hidden], [aria-hidden="true"]'));
    (focusable()[0] ?? ref.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if ((event.defaultPrevented && event.key !== "Escape") || comboboxEscape.current === event || document.querySelectorAll('[data-admin-dialog]').item(document.querySelectorAll('[data-admin-dialog]').length - 1) !== ref.current) return;
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); ref.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={label} aria-busy={busy} tabIndex={-1} data-admin-dialog className={className}
    onKeyDownCapture={event => {
      if (event.key !== "Escape") return;
      const openCombobox = ref.current?.querySelector('[role="combobox"][aria-expanded="true"]');
      comboboxEscape.current = openCombobox ? event.nativeEvent : null;
      const dialogs = document.querySelectorAll('[data-admin-dialog]');
      if (!openCombobox && !busy && dialogs.item(dialogs.length - 1) === ref.current) {
        event.preventDefault(); event.stopPropagation(); onClose();
      }
    }}
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>{children}</div>;
}
