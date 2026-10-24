"use client";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Shirt,
  Boxes,
  CreditCard,
  Printer,
  Settings,
  RefreshCw,
  Megaphone,
  Trophy,
  Ruler,
  CalendarDays,
  Banknote,
  Type,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
const tabs: {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin/overview",
    icon: LayoutDashboard,
  },
  { id: "orders", label: "Orders", href: "/admin/orders", icon: ReceiptText },
  { id: "products", label: "Products", href: "/admin/products", icon: Shirt },
  {
    id: "marketing",
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/admin/inventory",
    icon: Boxes,
  },
  {
    id: "payments",
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  { id: "print", label: "Print", href: "/admin/print", icon: Printer },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings/leagues",
    icon: Settings,
  },
  {
    id: "migration",
    label: "Data Migration",
    href: "/admin/data-migration",
    icon: RefreshCw,
  },
];

const settingSections: {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: "leagues", label: "Leagues", icon: Trophy },
  { id: "sizes", label: "Sizes", icon: Ruler },
  { id: "teams", label: "Teams", icon: Shirt },
  { id: "seasons", label: "Seasons", icon: CalendarDays },
  { id: "charges", label: "Charges", icon: Banknote },
  { id: "payment_methods", label: "Payment Methods", icon: CreditCard },
  { id: "fonts", label: "Fonts", icon: Type },
  { id: "whatsapp", label: "WhatsApp Numbers", icon: MessageCircle },
];

export default function AdminNavigation({
  onSettingNavigate,
}: {
  onSettingNavigate?: () => void;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const activeTab =
    tabs.find((tab) => pathname.startsWith(tab.href.split("/leagues")[0]))
      ?.id ?? "overview";
  const settingSection = pathname.split("/")[3] ?? "leagues";
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(
    activeTab === "settings",
  );
  useEffect(() => {
    if (!settingsMenuOpen) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setSettingsMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setSettingsMenuOpen(false); toggle.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [settingsMenuOpen]);
  const settingsLinks = settingSections.map(section => {
    const Icon = section.icon;
    return <Link key={section.id} href={`/admin/settings/${section.id}`} aria-current={activeTab === "settings" && settingSection === section.id ? "page" : undefined}
      onClick={() => { setSettingsMenuOpen(false); onSettingNavigate?.(); }}
      className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] ${activeTab === "settings" && settingSection === section.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={14} />{section.label}</Link>;
  });
  return (
    <aside ref={root} className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] backdrop-blur md:bottom-auto md:right-auto md:top-0 md:h-screen md:w-72 md:border-r md:border-t-0 md:px-5 md:py-6">
      <div className="hidden items-center gap-3 md:flex">
        <Image
          src="/assets/tisa-logo.png"
          alt="TISA logo"
          width={38}
          height={38}
          className="rounded-lg"
          priority
        />
        <div>
          <p className="text-lg font-bold tracking-[0.18em]">TISA</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Admin console
          </p>
        </div>
      </div>

      <nav
        aria-label="Admin sections"
        className="flex gap-1 overflow-x-auto pb-1 md:mt-8 md:grid md:grid-cols-1 md:gap-2 md:overflow-visible md:pb-0"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.id === "settings") {
            return (
              <div key={tab.id} className="relative min-w-0 md:static">
                <button ref={toggle} type="button" aria-expanded={settingsMenuOpen} aria-controls={`${menuId} ${menuId}-mobile`}
                  onClick={() => setSettingsMenuOpen(open => !open)}
                  className={`flex w-[4.75rem] min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors md:h-11 md:w-full md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-[11px] ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="truncate">Settings</span>
                  <ChevronDown
                    size={13}
                    className={`hidden transition-transform md:ml-auto md:block ${settingsMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {settingsMenuOpen && <div id={menuId} aria-label="Settings navigation" className="hidden md:ml-6 md:mt-1 md:grid">{settingsLinks}</div>}
              </div>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setSettingsMenuOpen(false)}
              className={`flex w-[4.75rem] min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors md:h-11 md:w-full md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-[11px] ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      {settingsMenuOpen && <div id={`${menuId}-mobile`} aria-label="Mobile settings navigation" className="absolute inset-x-3 bottom-full mb-2 grid max-h-[60dvh] grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-border bg-background p-2 shadow-xl md:hidden">{settingsLinks}</div>}
    </aside>
  );
}
