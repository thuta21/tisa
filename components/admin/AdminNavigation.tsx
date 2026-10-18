"use client";
import { useState } from "react";
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
];

export default function AdminNavigation({
  onSettingNavigate,
}: {
  onSettingNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeTab =
    tabs.find((tab) => pathname.startsWith(tab.href.split("/leagues")[0]))
      ?.id ?? "overview";
  const settingSection = pathname.split("/")[3] ?? "leagues";
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(
    activeTab === "settings",
  );
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] backdrop-blur md:bottom-auto md:right-auto md:top-0 md:h-screen md:w-72 md:border-r md:border-t-0 md:px-5 md:py-6">
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
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setSettingsMenuOpen(true);
                  }}
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
                </Link>
                {settingsMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-44 rounded-lg border border-border bg-background p-1 shadow-lg md:static md:mb-0 md:ml-6 md:mt-1 md:w-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                    {settingSections.map((section) => {
                      const SectionIcon = section.icon;
                      const sectionActive =
                        activeTab === "settings" &&
                        settingSection === section.id;
                      return (
                        <Link
                          key={section.id}
                          href={`/admin/settings/${section.id}`}
                          aria-current={sectionActive ? "page" : undefined}
                          onClick={() => onSettingNavigate?.()}
                          className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                            sectionActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <SectionIcon size={13} />
                          {section.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
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
    </aside>
  );
}
