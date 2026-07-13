"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Eye,
  LayoutDashboard,
  Mail,
  PackageCheck,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Ruler,
  Search,
  Settings,
  ShieldAlert,
  Shirt,
  Trash2,
  Truck,
  Trophy,
  Type,
  Upload,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type DbFont } from "@/lib/jerseys";
import {
  downloadProductImportTemplate,
  parseProductImportFile,
  productImportKits,
  type ProductImportPreview,
  type ProductImportReference,
  type ProductImportRow,
} from "@/lib/product-import";

const fontSelect = "id,name,slug,category,preview_text,price,created_at,updated_at";

type AdminTab = "overview" | "orders" | "products" | "inventory" | "payments" | "print" | "settings";
type SettingSection = "leagues" | "sizes" | "teams" | "seasons" | "charges" | "payment_methods" | "fonts";
type KitVariant = "home" | "away" | "third";
type ProductStatus = "draft" | "active" | "archived";
type OrderStatus =
  | "awaiting_payment"
  | "verification_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_rejected";
type PaymentProvider = "kpay" | "wave";
type OrderPaymentMethod = string;
type PaymentStatus = "pending" | "verified" | "rejected";
type DeliveryStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type OrderPaymentFilter = "all" | "paid" | "unpaid";
type OrderDateFilter = "all" | "today" | "yesterday" | "last_7_days" | "this_month";
type ArmBadge = "" | "ucl" | "epl";
type AddOnPricing = { customization: number; armBadge: number };

type DbOrderItem = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number;
  product_name: string;
  kit_name: string;
  size: string;
  custom_name: string | null;
  custom_number: string | null;
  font_slug: string | null;
  arm_badge: ArmBadge | null;
  customization_fee: number;
  arm_badge_fee: number;
  unit_price: number;
  line_total: number;
};

type DbPaymentProof = {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  transaction_id: string;
  amount: number;
  storage_path: string;
  status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
    total: number;
  } | null;
};

type DbOrderStatusHistory = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

type DbOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  country: string;
  region: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  payment_method: OrderPaymentMethod;
  payment_method_name?: string;
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
  order_items?: DbOrderItem[];
  payment_proofs?: DbPaymentProof[];
  order_status_history?: DbOrderStatusHistory[];
};

type OrderItemFormState = {
  id?: string;
  product_id: string;
  variant_id: string;
  kit: KitVariant;
  product_name: string;
  kit_name: string;
  size: string;
  custom_name: string;
  custom_number: string;
  arm_badge: ArmBadge;
  quantity: string;
  unit_price: string;
};

type OrderFormState = {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  country: string;
  region: string;
  delivery_address: string;
  delivery_fee: string;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  payment_method: OrderPaymentMethod;
  customer_note: string;
  admin_note: string;
  items: OrderItemFormState[];
};

type PrintSlipSize = "rp425-4x6" | "a6" | "a5" | "thermal";

type DbInventory = {
  id: string;
  variant_id: string;
  size: string;
  quantity: number;
  reserved: number;
  is_active?: boolean;
};

type DbLeague = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type DbSeason = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type DbJerseySize = {
  id: string;
  label: string;
  sort_order: number;
};

type DbPaymentMethod = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

type PaymentMethodFormState = {
  id?: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: string;
};

type DbTeam = {
  id: string;
  league_id: string | null;
  name: string;
  slug: string;
  country: string | null;
  sort_order: number;
  leagues?: Pick<DbLeague, "id" | "name"> | null;
};

type DbVariant = {
  id: string;
  product_id: string;
  kit: KitVariant;
  name: string;
  sku: string | null;
  price: number;
  image_front_path: string | null;
  image_back_path: string | null;
  image_arm_path: string | null;
  available: boolean;
  inventory?: DbInventory[];
};

type DbProduct = {
  id: string;
  slug: string;
  league_id: string | null;
  team_id: string | null;
  season_id: string | null;
  name: string;
  team: string;
  category: string;
  collection: string | null;
  description: string | null;
  base_price: number;
  season: string | null;
  fabric: string | null;
  weight_gsm: number | null;
  breathability: number | null;
  durability: number | null;
  moisture_wicking: number | null;
  country_colors: string[];
  featured: boolean;
  status: ProductStatus;
  created_at: string;
  leagues?: Pick<DbLeague, "id" | "name"> | null;
  teams?: Pick<DbTeam, "id" | "name"> | null;
  seasons?: Pick<DbSeason, "id" | "name"> | null;
  product_variants?: DbVariant[];
};

type VariantFormState = {
  id?: string;
  kit: KitVariant;
  name: string;
  sku: string;
  price: string;
  image_front_path: string;
  image_back_path: string;
  image_arm_path: string;
  available: boolean;
  stockBySize: Record<string, string>;
};

type ProductFormState = {
  id?: string;
  slug: string;
  name: string;
  league_id: string;
  team_id: string;
  season_id: string;
  team: string;
  category: string;
  collection: string;
  description: string;
  base_price: string;
  season: string;
  fabric: string;
  country_colors: string;
  featured: boolean;
  status: ProductStatus;
  size_ids: string[];
  variants: Record<KitVariant, VariantFormState>;
};

type SettingFormState = {
  id?: string;
  name: string;
  slug: string;
  label: string;
  country: string;
  league_id: string;
  sort_order: string;
};

const tabs: { id: AdminTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ReceiptText },
  { id: "products", label: "Products", icon: Shirt },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "print", label: "Print", icon: Printer },
  { id: "settings", label: "Settings", icon: Settings },
];

const kitOptions: { id: KitVariant; label: string }[] = [
  { id: "home", label: "Home Kit" },
  { id: "away", label: "Away Kit" },
  { id: "third", label: "Third Kit" },
];

const allowedProductImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProductImageBytes = 10 * 1024 * 1024;

const orderStatusOptions: { id: OrderStatus; label: string }[] = [
  { id: "awaiting_payment", label: "Unpaid" },
  { id: "paid", label: "Paid" },
];

const deliveryStatusOptions: { id: DeliveryStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const orderPaymentFilterOptions: { id: OrderPaymentFilter; label: string }[] = [
  { id: "all", label: "All payments" },
  { id: "paid", label: "Paid" },
  { id: "unpaid", label: "Unpaid" },
];

const orderDateFilterOptions: { id: OrderDateFilter; label: string }[] = [
  { id: "all", label: "All dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7_days", label: "Last 7 days" },
  { id: "this_month", label: "This month" },
];

const deliveryRegions = {
  "United Arab Emirates": [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Umm Al Quwain",
    "Ras Al Khaimah",
    "Fujairah",
  ],
} as const;

const defaultSizes = "S, M, L, XL, 2XL";
const settingSections: {
  id: SettingSection;
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

const printSlipSizes: { id: PrintSlipSize; label: string; width: string; minHeight: string; pageSize: string }[] = [
  {
    id: "rp425-4x6",
    label: "RP425 — 4×6 inch",
    width: "101.6mm",
    minHeight: "152.4mm",
    pageSize: "101.6mm 152.4mm",
  },
  { id: "a6", label: "A6 slip", width: "105mm", minHeight: "148mm", pageSize: "A6" },
  { id: "a5", label: "A5 slip", width: "148mm", minHeight: "210mm", pageSize: "A5" },
  { id: "thermal", label: "Thermal 80mm", width: "80mm", minHeight: "160mm", pageSize: "80mm 160mm" },
];

function formatAed(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}


function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function matchesOrderDateFilter(value: string, filter: OrderDateFilter) {
  if (filter === "all") return true;

  const orderDate = new Date(value);
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  if (filter === "today") {
    return orderDate >= todayStart && orderDate < tomorrowStart;
  }

  if (filter === "yesterday") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    return orderDate >= yesterdayStart && orderDate < todayStart;
  }

  if (filter === "last_7_days") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    return orderDate >= weekStart && orderDate < tomorrowStart;
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return orderDate >= monthStart && orderDate < tomorrowStart;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function getBurmeseOrderStatus(status: OrderStatus) {
  const mapping: Record<OrderStatus, string> = {
    awaiting_payment: "ငွေပေးချေရန် စောင့်ဆိုင်းနေဆဲ",
    verification_pending: "ငွေလွှဲစလစ် စစ်ဆေးနေဆဲ",
    paid: "ငွေပေးချေမှု အောင်မြင်ပြီးပါပြီ",
    processing: "အော်ဒါ ပြင်ဆင်နေပါပြီ",
    shipped: "ပို့ဆောင်ရေးသို့ အပ်နှံပြီးပါပြီ",
    delivered: "ပို့ဆောင်မှု ပြီးမြောက်ပါပြီ",
    cancelled: "အော်ဒါ ပယ်ဖျက်လိုက်ပါပြီ",
    payment_rejected: "ငွေပေးချေမှုစလစ် ငြင်းပယ်ခံရပါသည်",
  };
  return mapping[status] || status;
}

function getBurmeseDeliveryStatus(status: DeliveryStatus) {
  const mapping: Record<DeliveryStatus, string> = {
    pending: "စောင့်ဆိုင်းဆဲ",
    processing: "ပြင်ဆင်နေဆဲ",
    shipped: "ပို့ဆောင်နေဆဲ (လမ်းခရီးတွင်)",
    delivered: "ရောက်ရှိပြီးပါပြီ",
    cancelled: "ပယ်ဖျက်လိုက်ပါပြီ",
  };
  return mapping[status] || status;
}

function getWhatsAppMessage(order: DbOrder) {
  const itemsText = (order.order_items ?? [])
    .map((item) => {
      let details = `${item.kit_name} / ${item.size}`;
      if (item.custom_name || item.custom_number) {
        details += ` (Print: ${item.custom_name || "-"} #${item.custom_number || "-"})`;
      }
      if (item.arm_badge) {
        details += ` (${item.arm_badge.toUpperCase()} Badge)`;
      }
      return `- ${item.product_name} (${details}) x ${item.quantity} [${formatAed(item.line_total)}]`;
    })
    .join("\n");

  const orderStatus = getBurmeseOrderStatus(order.status);
  const deliveryStatus = getBurmeseDeliveryStatus(order.delivery_status ?? "pending");

  return `မင်္ဂလာပါ ${order.customer_name} ရှင့်၊

TISA Premium Match Jersey Showroom မှ လူကြီးမင်းမှာယူထားသော အော်ဒါအတွက် အကြောင်းကြားစာဖြစ်ပါသည်။

Order Reference: ${order.order_number}
Order Status: ${orderStatus}
Delivery Status: ${deliveryStatus}

--- မှာယူခဲ့သော ပစ္စည်းအသေးစိတ် ---
${itemsText}

ကုန်ပစ္စည်းတန်ဖိုး: ${formatAed(order.subtotal)}
ပို့ဆောင်ခ: ${formatAed(order.delivery_fee)}
စုစုပေါင်းကျသင့်ငွေ: ${formatAed(order.total)}

--- ပို့ဆောင်မည့်လိပ်စာ ---
အမည် - ${order.customer_name}
ဖုန်းနံပါတ် - ${order.customer_phone}
လိပ်စာ - ${order.delivery_address}, ${order.region}, ${order.country}

ကျေးဇူးတင်ရှိပါသည်ရှင့်။`;
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isErrorActionMessage(message: string) {
  return /\b(error|failed|required|invalid|missing|cannot|not contain|not available|stopped)\b/i.test(message);
}

function normalizeLookupValue(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const defaultThemeColors = ["#111111", "#ffffff", "#737373"];

function getThemeColors(value: string) {
  const colors = splitCsv(value).slice(0, 3);
  return defaultThemeColors.map((fallback, index) => colors[index] || fallback);
}

function createSettingForm(section: SettingSection, item?: DbLeague | DbSeason | DbJerseySize | DbTeam): SettingFormState {
  const isSize = section === "sizes";
  const team = section === "teams" ? item as DbTeam | undefined : undefined;
  const size = isSize ? item as DbJerseySize | undefined : undefined;
  const namedItem = !isSize ? item as DbLeague | DbSeason | DbTeam | undefined : undefined;

  return {
    id: item?.id,
    name: namedItem?.name ?? "",
    slug: namedItem?.slug ?? "",
    label: size?.label ?? "",
    country: team?.country ?? "",
    league_id: team?.league_id ?? "",
    sort_order: item?.sort_order?.toString() ?? "0",
  };
}

function getSettingTitle(section: SettingSection) {
  return settingSections.find((item) => item.id === section)?.label ?? section;
}

function sortByOrder<T extends { sort_order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStatusLabel(status: OrderStatus) {
  return ["paid", "processing", "shipped", "delivered"].includes(status) ? "Paid" : "Unpaid";
}

function getStatusClass(status: OrderStatus) {
  return getStatusLabel(status) === "Paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-neutral-200 bg-neutral-100 text-neutral-700";
}

function getPaymentStatusValue(status: OrderStatus): OrderStatus {
  return getStatusLabel(status) === "Paid" ? "paid" : "awaiting_payment";
}

function getDeliveryStatusClass(status: DeliveryStatus) {
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (status === "shipped") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "processing") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-neutral-200 bg-neutral-100 text-neutral-700";
}

function getPaymentLabel(method?: PaymentProvider | "cod") {
  const labels: Record<PaymentProvider | "cod", string> = {
    cod: "COD",
    kpay: "KBZPay",
    wave: "WavePay",
  };
  return labels[method ?? "cod"];
}

function getOrderPaymentMethodLabel(method?: OrderPaymentMethod, configuredName?: string) {
  if (configuredName) return configuredName;
  if (!method || method === "cod") return "COD";
  if (method === "bank_pay") return "Bank Pay";
  return method
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPublicProductImage(path?: string | null) {
  if (!path) return "/assets/tisa-shirt.png";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const supabase = createSupabaseBrowserClient();
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function isInventoryActive(row: Pick<DbInventory, "is_active">) {
  return row.is_active !== false;
}

function getAvailableStock(row: Pick<DbInventory, "quantity" | "reserved" | "is_active">) {
  if (!isInventoryActive(row)) return 0;
  return Math.max(0, row.quantity - row.reserved);
}

function getProductStock(product: DbProduct) {
  const stock = { home: 0, away: 0, third: 0 } satisfies Record<KitVariant, number>;
  for (const variant of product.product_variants ?? []) {
    stock[variant.kit] = (variant.inventory ?? []).reduce((sum, row) => sum + getAvailableStock(row), 0);
  }
  return stock;
}

function getProductSizes(product: DbProduct) {
  const sizes = new Set<string>();
  for (const variant of product.product_variants ?? []) {
    for (const row of variant.inventory ?? []) {
      if (isInventoryActive(row)) sizes.add(row.size);
    }
  }
  return Array.from(sizes);
}

function createEmptyOrderItem(): OrderItemFormState {
  return {
    product_id: "",
    variant_id: "",
    kit: "home",
    product_name: "",
    kit_name: "Home Kit",
    size: "",
    custom_name: "",
    custom_number: "",
    arm_badge: "",
    quantity: "1",
    unit_price: "0",
  };
}

function createEmptyOrderForm(paymentMethods: DbPaymentMethod[] = []): OrderFormState {
  return {
    order_number: `TISA-${Date.now().toString().slice(-6)}`,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    country: "United Arab Emirates",
    region: "",
    delivery_address: "",
    delivery_fee: "0",
    status: "awaiting_payment",
    delivery_status: "pending",
    payment_method: paymentMethods.find((method) => method.is_active)?.slug ?? "cod",
    customer_note: "",
    admin_note: "",
    items: [createEmptyOrderItem()],
  };
}

function orderToForm(order: DbOrder): OrderFormState {
  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email ?? "",
    country: order.country || "United Arab Emirates",
    region: order.region,
    delivery_address: order.delivery_address,
    delivery_fee: String(order.delivery_fee),
    status: order.status,
    delivery_status: order.delivery_status ?? "pending",
    payment_method: order.payment_method ?? "cod",
    customer_note: order.customer_note ?? "",
    admin_note: order.admin_note ?? "",
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id ?? "",
      variant_id: item.variant_id ?? "",
      kit: "home",
      product_name: item.product_name,
      kit_name: item.kit_name,
      size: item.size,
      custom_name: item.custom_name ?? "",
      custom_number: item.custom_number ?? "",
      arm_badge: item.arm_badge ?? "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    })),
  };
}

function getOrderItemTotal(item: OrderItemFormState, pricing: AddOnPricing) {
  const addOnPrice = (item.custom_name || item.custom_number ? pricing.customization : 0)
    + (item.arm_badge ? pricing.armBadge : 0);
  return toNumber(item.quantity, 1) * (toNumber(item.unit_price) + addOnPrice);
}

function getOrderSubtotal(items: OrderItemFormState[], pricing: AddOnPricing) {
  return items.reduce((sum, item) => sum + getOrderItemTotal(item, pricing), 0);
}

function createEmptyProductForm(sizes: DbJerseySize[] = []): ProductFormState {
  return {
    slug: "",
    name: "",
    league_id: "",
    team_id: "",
    season_id: "",
    team: "",
    category: "World Cup",
    collection: "",
    description: "",
    base_price: "0",
    season: "2026",
    fabric: "Performance knit",
    country_colors: "#111111, #ffffff, #737373",
    featured: false,
    status: "active",
    size_ids: sizes.length ? sortByOrder(sizes).map((size) => size.id) : [],
    variants: {
      home: { kit: "home", name: "Home Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", image_arm_path: "", available: true, stockBySize: {} },
      away: { kit: "away", name: "Away Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", image_arm_path: "", available: false, stockBySize: {} },
      third: { kit: "third", name: "Third Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", image_arm_path: "", available: false, stockBySize: {} },
    },
  };
}

function productToForm(product: DbProduct, availableSizes: DbJerseySize[] = []): ProductFormState {
  const form = createEmptyProductForm(availableSizes);
  const productSizes = getProductSizes(product);
  const selectedSizeIds = sortByOrder(availableSizes)
    .filter((size) => productSizes.includes(size.label))
    .map((size) => size.id);
  const variants = { ...form.variants };

  for (const variant of product.product_variants ?? []) {
    variants[variant.kit] = {
      id: variant.id,
      kit: variant.kit,
      name: variant.name,
      sku: variant.sku ?? "",
      price: String(variant.price),
      image_front_path: variant.image_front_path ?? "",
      image_back_path: variant.image_back_path ?? "",
      image_arm_path: variant.image_arm_path ?? "",
      available: variant.available,
      stockBySize: Object.fromEntries(
        (variant.inventory ?? []).map((row) => [row.size, String(row.quantity)]),
      ),
    };
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    league_id: product.league_id ?? "",
    team_id: product.team_id ?? "",
    season_id: product.season_id ?? "",
    team: product.team,
    category: product.category,
    collection: product.collection ?? "",
    description: product.description ?? "",
    base_price: String(product.base_price),
    season: product.season ?? "",
    fabric: product.fabric ?? "",
    country_colors: product.country_colors.join(", "),
    featured: product.featured,
    status: product.status,
    size_ids: selectedSizeIds.length ? selectedSizeIds : form.size_ids,
    variants,
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "low" | "out">("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<OrderPaymentFilter>("all");
  const [orderDateFilter, setOrderDateFilter] = useState<OrderDateFilter>("all");
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<DeliveryStatus | "all">("all");
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "denied">("checking");
  const [authMessage, setAuthMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionIsError, setActionIsError] = useState(false);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<DbPaymentProof[]>([]);
  const [leagues, setLeagues] = useState<DbLeague[]>([]);
  const [teams, setTeams] = useState<DbTeam[]>([]);
  const [seasons, setSeasons] = useState<DbSeason[]>([]);
  const [sizes, setSizes] = useState<DbJerseySize[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<DbPaymentMethod[]>([]);
  const [addOnPricing, setAddOnPricing] = useState<AddOnPricing>({ customization: 2, armBadge: 5 });
  const [settingSection, setSettingSection] = useState<SettingSection>("leagues");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SettingFormState | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodFormState | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductFormState | null>(null);
  const [productImportPreview, setProductImportPreview] = useState<ProductImportPreview | null>(null);
  const [productImportFileName, setProductImportFileName] = useState("");
  const [parsingProductImport, setParsingProductImport] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderFormState | null>(null);
  const [viewingOrder, setViewingOrder] = useState<DbOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<DbOrder | null>(null);
  const productImportInputRef = useRef<HTMLInputElement | null>(null);

  // Fonts state variables
  const [fontsList, setFontsList] = useState<DbFont[]>([]);
  const [editingFont, setEditingFont] = useState<Partial<DbFont> | null>(null);
  const [savingFont, setSavingFont] = useState(false);
  const actionHasError = actionIsError || isErrorActionMessage(actionMessage);

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setActionMessage("");
    setActionIsError(false);
    const supabase = createSupabaseBrowserClient();

    const [ordersResult, productsResult, paymentsResult, leaguesResult, teamsResult, seasonsResult, sizesResult, paymentMethodsResult, pricingResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*), payment_proofs(*), order_status_history(*, profiles(display_name))")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*, leagues(id, name), teams(id, name), seasons(id, name), product_variants(*, inventory(*))")
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_proofs")
        .select("*, orders(order_number, customer_name, total)")
        .order("created_at", { ascending: false }),
      supabase.from("leagues").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("teams").select("*, leagues(id, name)").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("seasons").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("jersey_sizes").select("*").order("sort_order", { ascending: true }).order("label", { ascending: true }),
      supabase.from("payment_methods").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("commerce_settings").select("customization_price, arm_badge_price").eq("id", true).maybeSingle(),
    ]);

    const fontsResult = await supabase
      .from("fonts")
      .select(fontSelect)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    const firstError =
      ordersResult.error ??
      productsResult.error ??
      paymentsResult.error ??
      leaguesResult.error ??
      teamsResult.error ??
      seasonsResult.error ??
      sizesResult.error ??
      paymentMethodsResult.error ??
      pricingResult.error;
    if (firstError) {
      setActionMessage(firstError.message);
      setActionIsError(true);
    } else {
      const loadedPaymentMethods = (paymentMethodsResult.data ?? []) as DbPaymentMethod[];
      const paymentMethodNames = new Map(loadedPaymentMethods.map((method) => [method.slug, method.name]));
      setOrders(((ordersResult.data ?? []) as DbOrder[]).map((order) => ({
        ...order,
        payment_method_name: paymentMethodNames.get(order.payment_method),
      })));
      setProducts((productsResult.data ?? []) as DbProduct[]);
      setPaymentProofs((paymentsResult.data ?? []) as DbPaymentProof[]);
      setLeagues((leaguesResult.data ?? []) as DbLeague[]);
      setTeams((teamsResult.data ?? []) as DbTeam[]);
      setSeasons((seasonsResult.data ?? []) as DbSeason[]);
      setSizes((sizesResult.data ?? []) as DbJerseySize[]);
      setPaymentMethods(loadedPaymentMethods);
      setFontsList((fontsResult.data ?? []) as DbFont[]);
      if (pricingResult.data) {
        setAddOnPricing({
          customization: pricingResult.data.customization_price,
          armBadge: pricingResult.data.arm_badge_price,
        });
      }
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function checkAdminAccess() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userError || !userData.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        setAuthStatus("denied");
        setAuthMessage("Admin profile table is not ready yet. Push the Supabase schema, then assign your user role to admin.");
        return;
      }

      if (profile?.role !== "admin") {
        setAuthStatus("denied");
        setAuthMessage("This account is signed in, but it does not have admin access.");
        return;
      }

      setAuthStatus("authorized");
      await loadAdminData();
    }

    checkAdminAccess();

    return () => {
      mounted = false;
    };
  }, [loadAdminData, router]);

  const productImportReference = useMemo<ProductImportReference>(() => ({
    leagues,
    teams,
    seasons,
    sizes,
  }), [leagues, teams, seasons, sizes]);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const updateOrderStatus = async (order: DbOrder, status: OrderStatus) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) {
      setActionMessage(error.message);
      return;
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: status,
      note: "Updated from admin panel",
    });
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status } : item)));
  };

  const updateDeliveryStatus = async (order: DbOrder, deliveryStatus: DeliveryStatus) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("orders").update({ delivery_status: deliveryStatus }).eq("id", order.id);
    if (error) {
      setActionMessage(error.message);
      return;
    }
    setOrders((current) => current.map((item) => (
      item.id === order.id ? { ...item, delivery_status: deliveryStatus } : item
    )));
  };

  const updatePaymentStatus = async (proof: DbPaymentProof, status: PaymentStatus) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("payment_proofs")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? "Rejected from admin panel" : null,
      })
      .eq("id", proof.id);

    if (error) {
      setActionMessage(error.message);
      return;
    }

    const nextStatus = status === "verified" ? "paid" : "payment_rejected";
    const currentOrder = orders.find((o) => o.id === proof.order_id);
    const fromStatus = currentOrder?.status ?? null;

    await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", proof.order_id);

    await supabase.from("order_status_history").insert({
      order_id: proof.order_id,
      from_status: fromStatus,
      to_status: nextStatus,
      note: status === "verified"
        ? "Updated via payment proof approval"
        : "Updated via payment proof rejection",
    });

    await loadAdminData();
  };

  const saveOrder = async (form: OrderFormState) => {
    setActionMessage("");
    setActionIsError(false);
    const supabase = createSupabaseBrowserClient();
    const items = form.items.filter((item) => item.product_name.trim() && item.size.trim() && toNumber(item.quantity, 1) > 0);
    const subtotal = getOrderSubtotal(items, addOnPricing);
    const deliveryFee = toNumber(form.delivery_fee);
    const total = subtotal + deliveryFee;

    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.country.trim() || !form.region.trim() || !form.delivery_address.trim()) {
      setActionMessage("Customer name, phone, country, region, and delivery address are required.");
      setActionIsError(true);
      return;
    }

    if (!items.length) {
      setActionMessage("Add at least one order item.");
      setActionIsError(true);
      return;
    }

    const orderPayload = {
      order_number: form.order_number.trim() || `TISA-${Date.now().toString().slice(-6)}`,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email.trim() || null,
      country: form.country.trim(),
      region: form.region.trim(),
      delivery_address: form.delivery_address.trim(),
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: form.status,
      delivery_status: form.delivery_status,
      payment_method: form.payment_method,
      customer_note: form.customer_note.trim() || null,
      admin_note: form.admin_note.trim() || null,
    };

    const currentOrder = form.id ? orders.find((o) => o.id === form.id) : null;
    const statusChanged = currentOrder && currentOrder.status !== form.status;
    const isNewOrder = !form.id;

    const orderResult = form.id
      ? await supabase.from("orders").update(orderPayload).eq("id", form.id).select("id").single()
      : await supabase.from("orders").insert(orderPayload).select("id").single();

    if (orderResult.error || !orderResult.data) {
      setActionMessage(orderResult.error?.message ?? "Failed to save order.");
      setActionIsError(true);
      return;
    }

    const orderId = orderResult.data.id as string;

    if (isNewOrder) {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: null,
        to_status: form.status,
        note: "Order created via admin panel",
      });
    } else if (statusChanged) {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: currentOrder.status,
        to_status: form.status,
        note: "Status updated during order edit",
      });
    }
    const orderItems = items.map((item) => {
      const quantity = toNumber(item.quantity, 1);
      const unitPrice = toNumber(item.unit_price);
      return {
        id: item.id,
        payload: {
          order_id: orderId,
          product_id: item.product_id || null,
          variant_id: item.variant_id || null,
          product_name: item.product_name.trim(),
          kit_name: item.kit_name.trim() || kitOptions.find((kit) => kit.id === item.kit)?.label || "Home Kit",
          size: item.size.trim(),
          custom_name: item.custom_name.trim() || null,
          custom_number: item.custom_number.trim() || null,
          font_slug: null,
          arm_badge: item.arm_badge || null,
          customization_fee: item.custom_name || item.custom_number ? addOnPricing.customization : 0,
          arm_badge_fee: item.arm_badge ? addOnPricing.armBadge : 0,
          quantity,
          unit_price: unitPrice,
          line_total: getOrderItemTotal(item, addOnPricing),
        },
      };
    });

    const getStockErrorMessage = (message: string) => (
      message.includes("Insufficient stock")
        ? "Insufficient stock for one or more order items."
        : message
    );

    const orderItemChanged = (existing: DbOrderItem, next: (typeof orderItems)[number]["payload"]) => (
      existing.product_id !== next.product_id
      || existing.variant_id !== next.variant_id
      || existing.product_name !== next.product_name
      || existing.kit_name !== next.kit_name
      || existing.size !== next.size
      || (existing.custom_name ?? null) !== next.custom_name
      || (existing.custom_number ?? null) !== next.custom_number
      || (existing.font_slug ?? null) !== next.font_slug
      || (existing.arm_badge ?? null) !== next.arm_badge
      || existing.customization_fee !== next.customization_fee
      || existing.arm_badge_fee !== next.arm_badge_fee
      || existing.quantity !== next.quantity
      || existing.unit_price !== next.unit_price
      || existing.line_total !== next.line_total
    );

    if (!form.id) {
      const itemResult = await supabase.from("order_items").insert(orderItems.map((item) => item.payload));
      if (itemResult.error) {
        setActionMessage(getStockErrorMessage(itemResult.error.message));
        return;
      }
    } else {
      const existingItems = currentOrder?.order_items ?? [];
      const nextIds = new Set(orderItems.map((item) => item.id).filter(Boolean));

      for (const existingItem of existingItems) {
        if (nextIds.has(existingItem.id)) continue;
        const { error } = await supabase.from("order_items").delete().eq("id", existingItem.id);
        if (error) {
          setActionMessage(getStockErrorMessage(error.message));
          return;
        }
      }

      const existingById = new Map(existingItems.map((item) => [item.id, item]));
      for (const item of orderItems) {
        if (!item.id) {
          const { error } = await supabase.from("order_items").insert(item.payload);
          if (error) {
            setActionMessage(getStockErrorMessage(error.message));
            return;
          }
          continue;
        }

        const existingItem = existingById.get(item.id);
        if (!existingItem || !orderItemChanged(existingItem, item.payload)) continue;
        const { error } = await supabase.from("order_items").update(item.payload).eq("id", item.id);
        if (error) {
          setActionMessage(getStockErrorMessage(error.message));
          return;
        }
      }
    }

    setEditingOrder(null);
    setActionMessage("Order saved.");
    await loadAdminData();
  };

  const deleteOrder = async (order: DbOrder) => {
    if (!window.confirm(`Delete ${order.order_number}? This removes items and payment proofs too.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) {
      setActionMessage(error.message);
      return;
    }
    setViewingOrder(null);
    setActionMessage("Order deleted.");
    await loadAdminData();
  };

  const handleWhatsAppNotify = (order: DbOrder) => {
    const phoneClean = order.customer_phone.replace(/\D/g, "");
    let formattedPhone = phoneClean;
    if (formattedPhone.startsWith("09")) {
      formattedPhone = "959" + formattedPhone.slice(2);
    } else if (formattedPhone.startsWith("0")) {
      if (order.country === "United Arab Emirates") {
        formattedPhone = "971" + formattedPhone.slice(1);
      } else {
        formattedPhone = "959" + formattedPhone.slice(1);
      }
    } else if (!formattedPhone.startsWith("95") && !formattedPhone.startsWith("971")) {
      if (order.country === "United Arab Emirates") {
        formattedPhone = "971" + formattedPhone;
      } else {
        formattedPhone = "95" + formattedPhone;
      }
    }

    const message = getWhatsAppMessage(order);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleEmailFontDelivery = (order: DbOrder) => {
    if (!order.customer_email) {
      setActionMessage("Customer email is missing for this order.");
      return;
    }

    const fontItems = (order.order_items ?? []).filter((item) => item.size === "Font File");
    if (!fontItems.length) {
      setActionMessage("This order does not contain digital font files.");
      return;
    }

    const subject = encodeURIComponent(`TISA font delivery for ${order.order_number}`);
    const body = encodeURIComponent([
      `Hi ${order.customer_name},`,
      "",
      `Your payment for ${order.order_number} has been approved.`,
      "",
      "Font files:",
      ...fontItems.map((item) => `- ${item.product_name}`),
      "",
      "Download link: [paste signed private download link here]",
      "",
      "Thank you,",
      "TISA",
    ].join("\n"));

    window.location.href = `mailto:${order.customer_email}?subject=${subject}&body=${body}`;
  };

  const handleQuickStockUpdate = async (inventoryId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const inventoryRow = products
      .flatMap((product) => product.product_variants ?? [])
      .flatMap((variant) => variant.inventory ?? [])
      .find((row) => row.id === inventoryId);

    if (inventoryRow && newQuantity < inventoryRow.reserved) {
      setActionMessage(`Stock cannot be lower than reserved quantity (${inventoryRow.reserved}).`);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("inventory")
      .update({ quantity: newQuantity })
      .eq("id", inventoryId)
      .lte("reserved", newQuantity)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setActionMessage(error?.message ?? "Stock cannot be lower than reserved quantity.");
      return;
    }

    setActionMessage("Stock updated successfully.");
    await loadAdminData();
  };

  const handleExportOrdersToCsv = (exportOrders: DbOrder[] = orders) => {
    if (exportOrders.length === 0) {
      setActionMessage("No orders available to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "Phone",
      "Email",
      "Country",
      "Region",
      "Delivery Address",
      "Ordered Items",
      "Subtotal",
      "Delivery Fee",
      "Total",
      "Order Status",
      "Delivery Status",
      "Created At",
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(","),
      ...exportOrders.map((order) => {
        const itemsString = (order.order_items ?? [])
          .map((item) => `${item.product_name} (${item.kit_name} / ${item.size}) x${item.quantity}`)
          .join("; ");

        return [
          escapeCsv(order.order_number),
          escapeCsv(order.customer_name),
          escapeCsv(order.customer_phone),
          escapeCsv(order.customer_email),
          escapeCsv(order.country),
          escapeCsv(order.region),
          escapeCsv(order.delivery_address),
          escapeCsv(itemsString),
          order.subtotal,
          order.delivery_fee,
          order.total,
          escapeCsv(order.status),
          escapeCsv(order.delivery_status),
          escapeCsv(new Date(order.created_at).toLocaleString()),
        ].join(",");
      }),
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TISA_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActiveSettingRows = () => {
    if (settingSection === "leagues") return leagues;
    if (settingSection === "teams") return teams;
    if (settingSection === "seasons") return seasons;
    if (settingSection === "sizes") return sizes;
    return [];
  };

  const saveSetting = async (section: SettingSection, form: SettingFormState) => {
    const supabase = createSupabaseBrowserClient();
    const name = section === "sizes" ? form.label.trim().toUpperCase() : form.name.trim();
    const slug = form.slug.trim() || slugify(name);

    if (!name || (section !== "sizes" && !slug)) {
      setActionMessage(`${getSettingTitle(section).slice(0, -1)} name is required.`);
      setActionIsError(true);
      return;
    }

    const order = toNumber(form.sort_order);
    let result;

    if (section === "sizes") {
      const payload = { label: name, sort_order: order };
      result = form.id
        ? await supabase.from("jersey_sizes").update(payload).eq("id", form.id)
        : await supabase.from("jersey_sizes").insert(payload);
    } else if (section === "teams") {
      const payload = {
        name,
        slug,
        league_id: form.league_id || null,
        country: form.country.trim() || null,
        sort_order: order,
      };
      result = form.id
        ? await supabase.from("teams").update(payload).eq("id", form.id)
        : await supabase.from("teams").insert(payload);
    } else if (section === "leagues") {
      const payload = { name, slug, sort_order: order };
      result = form.id
        ? await supabase.from("leagues").update(payload).eq("id", form.id)
        : await supabase.from("leagues").insert(payload);
    } else {
      const payload = { name, slug, sort_order: order };
      result = form.id
        ? await supabase.from("seasons").update(payload).eq("id", form.id)
        : await supabase.from("seasons").insert(payload);
    }

    if (result.error) {
      setActionMessage(result.error.message);
      setActionIsError(true);
      return;
    }

    setEditingSetting(null);
    setActionMessage(`${getSettingTitle(section).slice(0, -1)} saved.`);
    await loadAdminData();
  };

  const saveAddOnPricing = async () => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("commerce_settings").upsert({
      id: true,
      customization_price: Math.max(0, Math.floor(addOnPricing.customization)),
      arm_badge_price: Math.max(0, Math.floor(addOnPricing.armBadge)),
    });
    setActionMessage(error ? error.message : "Additional prices saved.");
    setActionIsError(Boolean(error));
  };

  const savePaymentMethod = async (form: PaymentMethodFormState) => {
    const supabase = createSupabaseBrowserClient();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) {
      setActionMessage("Payment method name is required.");
      setActionIsError(true);
      return;
    }

    const payload = {
      name,
      slug,
      is_active: form.is_active,
      sort_order: toNumber(form.sort_order),
    };
    const result = form.id
      ? await supabase.from("payment_methods").update(payload).eq("id", form.id)
      : await supabase.from("payment_methods").insert(payload);

    if (result.error) {
      setActionMessage(result.error.message);
      setActionIsError(true);
      return;
    }

    setEditingPaymentMethod(null);
    setActionMessage("Payment method saved.");
    await loadAdminData();
  };

  const deletePaymentMethod = async (method: DbPaymentMethod) => {
    if (!window.confirm(`Delete ${method.name}? Methods used by existing orders cannot be deleted.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("payment_methods").delete().eq("id", method.id);
    if (error) {
      setActionMessage(error.message);
      return;
    }
    setActionMessage("Payment method deleted.");
    await loadAdminData();
  };

  const handleSaveFont = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFont) return;

    const fontName = editingFont.name?.trim();
    const fontSlug = editingFont.slug?.trim();
    if (!fontName) {
      window.alert("Font name is required");
      return;
    }
    if (!fontSlug) {
      window.alert("Font slug is required");
      return;
    }

    setSavingFont(true);
    const supabase = createSupabaseBrowserClient();
    const fontCategory = editingFont.category?.trim() || "Uncategorized";
    const previewText = editingFont.preview_text?.trim() || "CHAMPIONS 10";
    const filePath = editingFont.file_path?.trim() || `fonts/${fontSlug}.ttf`;
    const deliveryFilePath = editingFont.delivery_file_path?.trim() || filePath;

    const { error: saveError } = await supabase
      .from("fonts")
      .upsert({
        id: !editingFont.id ? undefined : editingFont.id,
        name: fontName,
        slug: fontSlug,
        category: fontCategory,
        preview_text: previewText,
        file_path: filePath,
        delivery_file_path: deliveryFilePath,
        font_url: "",
        price: Number(editingFont.price) || 0,
      });

    if (saveError) {
      window.alert(`Save error: ${saveError.message}`);
    } else {
      setEditingFont(null);
      await loadAdminData();
      setActionMessage("Font saved successfully.");
    }
    setSavingFont(false);
  };

  const handleDeleteFont = async (font: DbFont) => {
    if (!window.confirm(`Are you sure you want to delete the font "${font.name}"?`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("fonts").delete().eq("id", font.id);
    if (error) {
      window.alert(`Delete error: ${error.message}`);
    } else {
      await loadAdminData();
      setActionMessage("Font deleted.");
    }
  };

  const deleteSetting = async (section: SettingSection, item: DbLeague | DbSeason | DbJerseySize | DbTeam) => {
    const label = "label" in item ? item.label : item.name;
    if (!window.confirm(`Delete ${label}? Existing products will keep their text values, but the lookup link may be cleared.`)) return;

    const supabase = createSupabaseBrowserClient();
    const table = section === "sizes" ? "jersey_sizes" : section;
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      setActionMessage(error.message);
      return;
    }

    setActionMessage(`${getSettingTitle(section).slice(0, -1)} deleted.`);
    await loadAdminData();
  };

  const persistProductForm = async (form: ProductFormState) => {
    const supabase = createSupabaseBrowserClient();
    const slug = form.slug.trim() || slugify(form.name);
    const basePrice = toNumber(form.base_price);
    const selectedLeague = leagues.find((league) => league.id === form.league_id);
    const selectedTeam = teams.find((team) => team.id === form.team_id);
    const selectedSeason = seasons.find((season) => season.id === form.season_id);
    const selectedSizes = sortByOrder(sizes).filter((size) => form.size_ids.includes(size.id));
    const inventorySizes = selectedSizes.length ? selectedSizes.map((size) => size.label) : splitCsv(defaultSizes);

    if (!slug || !form.name.trim() || !selectedTeam || !selectedLeague || !selectedSeason) {
      throw new Error("Product name, league, team, and season are required.");
    }

    const payload = {
      slug,
      name: form.name.trim(),
      league_id: selectedLeague.id,
      team_id: selectedTeam.id,
      season_id: selectedSeason.id,
      team: selectedTeam.name,
      category: selectedLeague.name,
      collection: form.collection.trim() || null,
      description: form.description.trim() || null,
      base_price: basePrice,
      season: selectedSeason.name,
      fabric: form.fabric.trim() || null,
      weight_gsm: null,
      breathability: null,
      durability: null,
      moisture_wicking: null,
      country_colors: getThemeColors(form.country_colors),
      featured: form.featured,
      status: form.status,
    };

    const productResult = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("products").insert(payload).select("id").single();

    if (productResult.error || !productResult.data) {
      throw new Error(productResult.error?.message ?? "Failed to save product.");
    }

    const productId = productResult.data.id as string;
    const currentProduct = form.id ? products.find((product) => product.id === form.id) : null;

    for (const kit of kitOptions) {
      const variant = form.variants[kit.id];
      const variantPayload = {
        product_id: productId,
        kit: kit.id,
        name: variant.name.trim() || kit.label,
        sku: variant.sku.trim() || null,
        price: toNumber(variant.price, basePrice),
        image_front_path: variant.image_front_path.trim() || null,
        image_back_path: variant.image_back_path.trim() || null,
        image_arm_path: variant.image_arm_path.trim() || null,
        available: variant.available,
      };

      const variantResult = variant.id
        ? await supabase.from("product_variants").update(variantPayload).eq("id", variant.id).select("id").single()
        : await supabase.from("product_variants").insert(variantPayload).select("id").single();

      if (variantResult.error || !variantResult.data) {
        throw new Error(variantResult.error?.message ?? `Failed to save ${kit.label}.`);
      }

      const variantId = variantResult.data.id as string;
      const existingInventory = currentProduct?.product_variants
        ?.find((item) => item.id === variantId || item.kit === kit.id)
        ?.inventory ?? [];
      const existingBySize = new Map(existingInventory.map((row) => [row.size, row]));
      const selectedSizeSet = new Set(inventorySizes);

      if (inventorySizes.length) {
        const inventoryRows = inventorySizes.map((size) => ({
          variant_id: variantId,
          size,
          quantity: Math.max(
            existingBySize.get(size)?.reserved ?? 0,
            variant.available ? Math.max(0, Math.floor(toNumber(variant.stockBySize[size]))) : 0,
          ),
          is_active: variant.available,
        }));
        const inventoryResult = await supabase
          .from("inventory")
          .upsert(inventoryRows, { onConflict: "variant_id,size" });
        if (inventoryResult.error) {
          throw new Error(inventoryResult.error.message);
        }
      }

      const removedSizes = existingInventory
        .filter((row) => isInventoryActive(row) && !selectedSizeSet.has(row.size))
        .map((row) => row.size);

      if (removedSizes.length) {
        const inactiveResult = await supabase
          .from("inventory")
          .update({ is_active: false })
          .eq("variant_id", variantId)
          .in("size", removedSizes);
        if (inactiveResult.error) {
          throw new Error(inactiveResult.error.message);
        }
      }
    }

    return productId;
  };

  const saveProduct = async (form: ProductFormState) => {
    try {
      await persistProductForm(form);
      setEditingProduct(null);
      await loadAdminData();
      setActionMessage("Product saved.");
    } catch (error) {
      setActionMessage(getErrorMessage(error));
      setActionIsError(true);
    }
  };

  const productImportRowToForm = (row: ProductImportRow): ProductFormState => {
    const selectedLeague = leagues.find((league) => normalizeLookupValue(league.name) === normalizeLookupValue(row.leagueName));
    const selectedTeam = selectedLeague
      ? teams.find((team) => (
        normalizeLookupValue(team.name) === normalizeLookupValue(row.teamName)
        && team.league_id === selectedLeague.id
      ))
      : null;
    const selectedSeason = seasons.find((season) => normalizeLookupValue(season.name) === normalizeLookupValue(row.seasonName));

    if (!selectedLeague || !selectedTeam || !selectedSeason) {
      throw new Error("Import row references a missing league, team, or season.");
    }

    const existingProduct = row.existingProductId
      ? products.find((product) => product.id === row.existingProductId) ?? null
      : null;
    const baseForm = existingProduct ? productToForm(existingProduct, sizes) : createEmptyProductForm(sizes);
    const selectedSizes = sortByOrder(sizes);
    const variants = { ...baseForm.variants };

    for (const kit of productImportKits) {
      const importVariant = row.variants[kit];
      const currentVariant = baseForm.variants[kit];
      const stockBySize = Object.fromEntries(
        selectedSizes.map((size) => [size.label, String(importVariant.stockBySize[size.label] ?? 0)]),
      );
      const kitLabel = kitOptions.find((option) => option.id === kit)?.label ?? currentVariant.name;

      variants[kit] = {
        ...currentVariant,
        kit,
        name: importVariant.name || currentVariant.name || kitLabel,
        sku: importVariant.sku || (existingProduct ? currentVariant.sku : ""),
        price: String(importVariant.price ?? row.basePrice),
        image_front_path: importVariant.image_front_path || (existingProduct ? currentVariant.image_front_path : ""),
        image_back_path: importVariant.image_back_path || (existingProduct ? currentVariant.image_back_path : ""),
        image_arm_path: importVariant.image_arm_path || (existingProduct ? currentVariant.image_arm_path : ""),
        available: importVariant.available,
        stockBySize,
      };
    }

    return {
      ...baseForm,
      slug: row.slug,
      name: row.name,
      league_id: selectedLeague.id,
      team_id: selectedTeam.id,
      season_id: selectedSeason.id,
      team: selectedTeam.name,
      category: selectedLeague.name,
      collection: row.collection,
      description: row.description,
      base_price: String(row.basePrice),
      season: selectedSeason.name,
      fabric: row.fabric || baseForm.fabric,
      country_colors: row.countryColors || baseForm.country_colors,
      featured: row.featured,
      status: row.status,
      size_ids: selectedSizes.map((size) => size.id),
      variants,
    };
  };

  const handleDownloadProductTemplate = async () => {
    setActionMessage("");
    setActionIsError(false);
    try {
      await downloadProductImportTemplate(productImportReference);
      setActionMessage("Product import template downloaded.");
    } catch (error) {
      setActionMessage(`Template download failed: ${getErrorMessage(error)}`);
      setActionIsError(true);
    }
  };

  const handleProductImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setActionMessage("");
    setActionIsError(false);
    setParsingProductImport(true);
    try {
      const preview = await parseProductImportFile(file, productImportReference, products);
      setProductImportFileName(file.name);
      setProductImportPreview(preview);
      setActiveTab("products");
    } catch (error) {
      setActionMessage(`Import file could not be read: ${getErrorMessage(error)}`);
      setActionIsError(true);
    } finally {
      setParsingProductImport(false);
    }
  };

  const handleConfirmProductImport = async () => {
    if (!productImportPreview || productImportPreview.issues.length > 0 || productImportPreview.rows.length === 0) return;

    setImportingProducts(true);
    let importedCount = 0;
    let updatedCount = 0;

    for (const row of productImportPreview.rows) {
      try {
        await persistProductForm(productImportRowToForm(row));
        importedCount += 1;
        if (row.existingProductId) updatedCount += 1;
      } catch (error) {
        await loadAdminData();
        setActionMessage(`Import stopped on row ${row.rowNumber}: ${getErrorMessage(error)}`);
        setActionIsError(true);
        setImportingProducts(false);
        return;
      }
    }

    setProductImportPreview(null);
    setProductImportFileName("");
    await loadAdminData();
    setActionMessage(`Imported ${importedCount} products, updated ${updatedCount} existing products.`);
    setImportingProducts(false);
  };

  const deleteProduct = async (product: DbProduct) => {
    if (!window.confirm(`Delete ${product.name}? This removes variants and inventory too.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      setActionMessage(error.message);
      setActionIsError(true);
      return;
    }
    setActionMessage("Product deleted.");
    await loadAdminData();
  };

  const productRows = useMemo(() => {
    return products.map((product) => {
      const stock = getProductStock(product);
      const totalStock = kitOptions.reduce((sum, kit) => sum + stock[kit.id], 0);
      return { product, stock, totalStock, sizes: getProductSizes(product) };
    });
  }, [products]);

  const analyticsData = useMemo(() => {
    const last6Months: { year: number; month: number; label: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" });
      last6Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label,
        revenue: 0,
      });
    }

    orders.forEach((order) => {
      if (["cancelled", "payment_rejected"].includes(order.status)) return;
      const orderDate = new Date(order.created_at);
      const idx = last6Months.findIndex(
        (m) => m.year === orderDate.getFullYear() && m.month === orderDate.getMonth()
      );
      if (idx !== -1) {
        last6Months[idx].revenue += order.total;
      }
    });

    const salesMap: Record<string, number> = {};
    orders.forEach((order) => {
      if (["cancelled", "payment_rejected"].includes(order.status)) return;
      (order.order_items ?? []).forEach((item) => {
        salesMap[item.product_name] = (salesMap[item.product_name] || 0) + item.quantity;
      });
    });

    const topSelling = Object.entries(salesMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { last6Months, topSelling };
  }, [orders]);

  const lowStockItems = useMemo(() => {
    const list: {
      inventoryId: string;
      productName: string;
      kitName: string;
      size: string;
      quantity: number;
      reserved: number;
    }[] = [];

    products.forEach((product) => {
      (product.product_variants ?? []).forEach((variant) => {
        if (!variant.available) return;
        (variant.inventory ?? []).forEach((inv) => {
          if (!isInventoryActive(inv)) return;
          const availableStock = getAvailableStock(inv);
          if (availableStock <= 8) {
            list.push({
              inventoryId: inv.id,
              productName: product.name,
              kitName: variant.name,
              size: inv.size,
              quantity: inv.quantity,
              reserved: inv.reserved,
            });
          }
        });
      });
    });

    return list;
  }, [products]);

  const inventoryRows = useMemo(() => {
    return products.flatMap((product) => (
      (product.product_variants ?? []).flatMap((variant) => (
        (variant.inventory ?? [])
          .filter(isInventoryActive)
          .map((inv) => ({
            inventoryId: inv.id,
            productId: product.id,
            productName: product.name,
            productStatus: product.status,
            kitName: variant.name,
            kit: variant.kit,
            sku: variant.sku,
            size: inv.size,
            quantity: inv.quantity,
            reserved: inv.reserved,
            available: getAvailableStock(inv),
            imagePath: variant.image_front_path,
            variantAvailable: variant.available,
          }))
      ))
    ));
  }, [products]);

  const filteredInventoryRows = useMemo(() => {
    const term = inventoryQuery.trim().toLowerCase();
    return inventoryRows.filter((row) => {
      const matchesSearch = !term || [
        row.productName,
        row.kitName,
        row.sku ?? "",
        row.size,
      ].some((value) => value.toLowerCase().includes(term));
      const matchesStock =
        inventoryStockFilter === "all"
        || (inventoryStockFilter === "low" && row.available > 0 && row.available <= 8)
        || (inventoryStockFilter === "out" && row.available <= 0);
      return matchesSearch && matchesStock;
    });
  }, [inventoryQuery, inventoryRows, inventoryStockFilter]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = !term || [
        order.order_number,
        order.customer_name,
        order.customer_phone,
        order.customer_email ?? "",
        order.country,
        order.region,
      ].some((value) => value.toLowerCase().includes(term));

      const matchesPayment = orderPaymentFilter === "all" || getStatusLabel(order.status).toLowerCase() === orderPaymentFilter;
      const matchesDate = matchesOrderDateFilter(order.created_at, orderDateFilter);
      const matchesDelivery = orderDeliveryFilter === "all" || (order.delivery_status ?? "pending") === orderDeliveryFilter;

      return matchesSearch && matchesPayment && matchesDate && matchesDelivery;
    });
  }, [orders, query, orderPaymentFilter, orderDateFilter, orderDeliveryFilter]);

  const hasOrderFilters = Boolean(query.trim())
    || orderPaymentFilter !== "all"
    || orderDateFilter !== "all"
    || orderDeliveryFilter !== "all";

  const pendingPayments = paymentProofs.filter((proof) => proof.status === "pending").length;
  const today = new Date().toDateString();
  const todayRevenue = orders
    .filter((order) => new Date(order.created_at).toDateString() === today && !["cancelled", "payment_rejected"].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);
  const lowStockProducts = productRows.filter((row) => row.totalStock > 0 && row.totalStock <= 8).length;
  const outOfStockKits = productRows.reduce(
    (count, row) => count + kitOptions.filter((kit) => row.stock[kit.id] === 0).length,
    0,
  );
  const readyVariants = productRows.length * kitOptions.length - outOfStockKits;

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 text-center">
        <div>
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Checking admin session
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert size={22} />
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Access blocked</p>
          <h1 className="mt-2 text-2xl font-bold">Admin role required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{authMessage}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleLogout}
              className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"
            >
              Use another login
            </button>
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]"
            >
              Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-admin-page className="min-h-screen bg-[#f7f7f5] text-foreground">
      <aside className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] backdrop-blur md:bottom-auto md:right-auto md:top-0 md:h-screen md:w-72 md:border-r md:border-t-0 md:px-5 md:py-6">
        <div className="hidden items-center gap-3 md:flex">
          <Image src="/assets/tisa-logo.png" alt="TISA logo" width={38} height={38} className="rounded-lg" priority />
          <div>
            <p className="text-lg font-bold tracking-[0.18em]">TISA</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin console</p>
          </div>
        </div>

        <nav className="grid grid-cols-7 gap-1 md:mt-8 md:grid-cols-1 md:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.id === "settings") {
              return (
                <div key={tab.id} className="relative min-w-0 md:static">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("settings");
                      setSettingsMenuOpen((open) => !open);
                    }}
                    className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors md:h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-[11px] ${
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
                  {settingsMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-44 rounded-lg border border-border bg-background p-1 shadow-lg md:static md:mb-0 md:ml-6 md:mt-1 md:w-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                      {settingSections.map((section) => {
                        const SectionIcon = section.icon;
                        const sectionActive = activeTab === "settings" && settingSection === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => {
                              setActiveTab("settings");
                              setSettingSection(section.id);
                              setEditingSetting(null);
                              setSettingsMenuOpen(true);
                            }}
                            className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                              sectionActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <SectionIcon size={13} />
                            {section.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSettingsMenuOpen(false);
                }}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors md:h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-[11px] ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      <main className="px-4 pb-24 pt-5 md:ml-72 md:px-8 md:pb-10 md:pt-8 xl:px-10">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                Storefront <ArrowUpRight size={13} />
              </Link>
              <Link href="/pricelists" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                Pricelists <ArrowUpRight size={13} />
              </Link>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Admin Panel</h1>
          </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-primary/40"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-primary/40"
            >
              Logout
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("products");
                setEditingProduct(createEmptyProductForm(sizes));
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={13} /> Add Product
            </button>
          </div>
        </header>

        {actionMessage && (
          <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${actionHasError ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-background text-muted-foreground"}`}>
            {actionMessage}
          </div>
        )}

        {loadingData ? (
          <div className="mt-8 rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
            Loading Supabase data...
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <section className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Today revenue" value={formatAed(todayRevenue)} icon={CircleDollarSign} tone="dark" />
                  <MetricCard label="Open orders" value={orders.length.toString()} icon={ReceiptText} />
                  <MetricCard label="Payment review" value={pendingPayments.toString()} icon={Clock3} attention={pendingPayments > 0} />
                  <MetricCard label="Low stock products" value={lowStockProducts.toString()} icon={Boxes} attention={lowStockProducts > 0} />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <article className="rounded-xl border border-border bg-background p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Sales Analytics</p>
                    <h3 className="mt-1 text-lg font-bold">Monthly Revenue Trend</h3>
                    <div className="mt-6 flex h-48 items-end justify-between gap-3 border-b border-border pb-2">
                      {(() => {
                        const maxRevenue = Math.max(...analyticsData.last6Months.map((m) => m.revenue), 1);
                        return analyticsData.last6Months.map((m, index) => {
                          const heightPercent = (m.revenue / maxRevenue) * 100;
                          return (
                            <div key={index} className="group relative flex flex-1 flex-col items-center">
                              <span className="pointer-events-none absolute bottom-full mb-2 z-10 scale-95 opacity-0 rounded bg-neutral-900 px-2 py-1 text-[10px] text-white transition-all group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap">
                                {formatAed(m.revenue)}
                              </span>
                              <div
                                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                className="w-full rounded-t bg-primary/20 group-hover:bg-primary transition-all duration-300 relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
                              </div>
                              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                                {m.label}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </article>

                  <article className="rounded-xl border border-border bg-background p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Product Performance</p>
                    <h3 className="mt-1 text-lg font-bold">Top Selling Jerseys</h3>
                    <div className="mt-6 space-y-4">
                      {analyticsData.topSelling.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">No sales data available yet.</p>
                      ) : (() => {
                        const maxQty = Math.max(...analyticsData.topSelling.map((p) => p.qty), 1);
                        return analyticsData.topSelling.map((product, index) => {
                          const widthPercent = (product.qty / maxQty) * 100;
                          return (
                            <div key={index} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground truncate max-w-[200px]">{product.name}</span>
                                <span className="font-bold text-muted-foreground">{product.qty} sold</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  style={{ width: `${widthPercent}%` }}
                                  className="h-full rounded-full bg-primary/80 transition-all duration-500"
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </article>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
                  <OrdersPanel orders={orders.slice(0, 4)} compact onStatusChange={updateOrderStatus} onDeliveryStatusChange={updateDeliveryStatus} onNotify={handleWhatsAppNotify} />
                  <div className="space-y-6">
                    <PaymentsPanel proofs={paymentProofs.filter((proof) => proof.status === "pending").slice(0, 4)} onStatusChange={updatePaymentStatus} />
                    <LowStockPanel items={lowStockItems} onUpdateStock={handleQuickStockUpdate} />
                  </div>
                </div>

                <ProductsPanel rows={productRows.slice(0, 5)} sizes={sizes} compact onEdit={setEditingProduct} onDelete={deleteProduct} />
              </section>
            )}

            {activeTab === "orders" && (
              <section className="mt-6 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-md flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search order, customer, phone..."
                      className="h-11 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportOrdersToCsv(filteredOrders)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-primary/40"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionMessage("");
                        setEditingOrder(createEmptyOrderForm(paymentMethods));
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"
                    >
                      <Plus size={13} /> Add Order
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
                    <select
                      value={orderPaymentFilter}
                      onChange={(event) => setOrderPaymentFilter(event.target.value as OrderPaymentFilter)}
                      className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
                    >
                      {orderPaymentFilterOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={orderDateFilter}
                      onChange={(event) => setOrderDateFilter(event.target.value as OrderDateFilter)}
                      className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
                    >
                      {orderDateFilterOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={orderDeliveryFilter}
                      onChange={(event) => setOrderDeliveryFilter(event.target.value as DeliveryStatus | "all")}
                      className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
                    >
                      <option value="all">All delivery</option>
                      {deliveryStatusOptions.map((status) => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Showing {filteredOrders.length} of {orders.length}
                    </p>
                    {hasOrderFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setOrderPaymentFilter("all");
                          setOrderDateFilter("all");
                          setOrderDeliveryFilter("all");
                        }}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50"
                      >
                        <X size={12} /> Reset
                      </button>
                    )}
                  </div>
                </div>
                <OrdersPanel
                  orders={filteredOrders}
                  onStatusChange={updateOrderStatus}
                  onDeliveryStatusChange={updateDeliveryStatus}
                  onView={setViewingOrder}
                  onEdit={(order) => {
                    setActionMessage("");
                    setEditingOrder(orderToForm(order));
                  }}
                  onDelete={deleteOrder}
                  onPrint={setPrintingOrder}
                  onNotify={handleWhatsAppNotify}
                />
              </section>
            )}

            {activeTab === "products" && (
              <section className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Active products" value={products.filter((product) => product.status === "active").length.toString()} icon={Shirt} />
                  <MetricCard label="Out of stock kits" value={outOfStockKits.toString()} icon={AlertTriangle} attention={outOfStockKits > 0} />
                  <MetricCard label="Ready variants" value={readyVariants.toString()} icon={PackageCheck} />
                </div>
                <ProductsPanel
                  rows={productRows}
                  sizes={sizes}
                  onEdit={setEditingProduct}
                  onDelete={deleteProduct}
                  actions={(
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={productImportInputRef}
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={handleProductImportFile}
                      />
                      <button
                        type="button"
                        onClick={handleDownloadProductTemplate}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground hover:border-primary/50"
                      >
                        <Download size={13} /> Download Template
                      </button>
                      <button
                        type="button"
                        disabled={parsingProductImport}
                        onClick={() => productImportInputRef.current?.click()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload size={13} /> {parsingProductImport ? "Reading..." : "Import Excel"}
                      </button>
                    </div>
                  )}
                />
              </section>
            )}

            {activeTab === "inventory" && (
              <section className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Available units" value={inventoryRows.reduce((sum, row) => sum + row.available, 0).toString()} icon={Boxes} />
                  <MetricCard label="Low stock sizes" value={inventoryRows.filter((row) => row.available > 0 && row.available <= 8).length.toString()} icon={AlertTriangle} attention={inventoryRows.some((row) => row.available > 0 && row.available <= 8)} />
                  <MetricCard label="Out of stock sizes" value={inventoryRows.filter((row) => row.available <= 0).length.toString()} icon={PackageCheck} attention={inventoryRows.some((row) => row.available <= 0)} />
                </div>
                <InventoryPanel
                  rows={filteredInventoryRows}
                  query={inventoryQuery}
                  stockFilter={inventoryStockFilter}
                  totalRows={inventoryRows.length}
                  onQueryChange={setInventoryQuery}
                  onStockFilterChange={setInventoryStockFilter}
                  onUpdateStock={handleQuickStockUpdate}
                />
              </section>
            )}

            {activeTab === "payments" && (
              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <PaymentsPanel proofs={paymentProofs} onStatusChange={updatePaymentStatus} />
                <PaymentSettingsCard productCount={products.length} orderCount={orders.length} pendingPayments={pendingPayments} />
              </section>
            )}

            {activeTab === "print" && (
              <PrintPanel orders={orders} />
            )}

            {activeTab === "settings" && (
              <section className="mt-6 space-y-6">
                <section className="rounded-xl border border-border bg-background p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
                  <h2 className="mt-1 text-xl font-bold">{getSettingTitle(settingSection)}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {settingSection === "charges"
                      ? "Manage additional prices for product customizations, such as print name & number, and arm badges."
                      : settingSection === "payment_methods"
                        ? "Add, rename, order, enable, or disable the payment methods available when creating orders."
                      : settingSection === "fonts"
                        ? "Manage custom team jersey fonts. Upload .ttf files, set pricing, and customize slugs to match jerseys."
                        : "Use the Settings submenu in the sidebar to switch between Leagues, Sizes, Teams, Seasons, and Charges."}
                  </p>
                </section>
                {settingSection === "charges" && (
                  <section className="rounded-xl border border-border bg-background p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Order additional</p>
                    <h2 className="mt-1 text-lg font-bold">Additional prices</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <FormField
                        label="Customized name & number (AED)"
                        value={String(addOnPricing.customization)}
                        type="number"
                        onChange={(value) => setAddOnPricing((current) => ({ ...current, customization: toNumber(value) }))}
                      />
                      <FormField
                        label="Arm badge (AED)"
                        value={String(addOnPricing.armBadge)}
                        type="number"
                        onChange={(value) => setAddOnPricing((current) => ({ ...current, armBadge: toNumber(value) }))}
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button type="button" onClick={saveAddOnPricing} className="h-10 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                        Save prices
                      </button>
                    </div>
                  </section>
                )}
                {settingSection === "fonts" && (
                  <section className="rounded-xl border border-border bg-background p-5">
                    {editingFont ? (
                      <form onSubmit={handleSaveFont} className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider">{editingFont.id ? "Edit Font" : "Add Font"}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Font Name
                            <input
                              required
                              type="text"
                              value={editingFont.name || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingFont((current) => ({
                                  ...current,
                                  name: val,
                                  slug: current?.id ? (current.slug || "") : slugify(val) + "-font",
                                }));
                              }}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                              placeholder="e.g. Real Madrid 24/25"
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Font Slug
                            <input
                              required
                              type="text"
                              value={editingFont.slug || ""}
                              onChange={(e) => setEditingFont((current) => ({ ...current, slug: e.target.value }))}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                              placeholder="e.g. real-madrid-font"
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Price (AED)
                            <input
                              required
                              type="number"
                              min="0"
                              value={String(editingFont.price ?? 0)}
                              onChange={(e) => setEditingFont((current) => ({ ...current, price: Number(e.target.value) || 0 }))}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Category
                            <input
                              type="text"
                              value={editingFont.category || ""}
                              onChange={(e) => setEditingFont((current) => ({ ...current, category: e.target.value }))}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                              placeholder="e.g. World Cup"
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Preview Text
                            <input
                              type="text"
                              value={editingFont.preview_text || ""}
                              onChange={(e) => setEditingFont((current) => ({ ...current, preview_text: e.target.value.toUpperCase().slice(0, 24) }))}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                              placeholder="CHAMPIONS 10"
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
                            Private File Path
                            <input
                              type="text"
                              value={editingFont.file_path || ""}
                              onChange={(e) => setEditingFont((current) => ({ ...current, file_path: e.target.value }))}
                              className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground focus:border-primary outline-none"
                              placeholder="fonts/real-madrid-font.ttf"
                            />
                          </label>
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFont(null);
                            }}
                            className="h-10 rounded-full border border-border bg-background px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingFont}
                            className="h-10 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50"
                          >
                            {savingFont ? "Saving..." : "Save Font"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold uppercase tracking-wider">Font List</h3>
                          <button
                            type="button"
                            onClick={() => setEditingFont({ name: "", slug: "", category: "World Cup", preview_text: "CHAMPIONS 10", price: 0, font_url: "", file_path: "" })}
                            className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
                          >
                            <Plus size={12} /> Add Font
                          </button>
                        </div>
                        {fontsList.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-border rounded-xl">
                            <p className="text-xs text-muted-foreground font-mono">No fonts configured. Click Add Font to add one.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[9px]">
                                  <th className="pb-3 font-semibold">Name</th>
                                  <th className="pb-3 font-semibold">Category</th>
                                  <th className="pb-3 font-semibold">Slug</th>
                                  <th className="pb-3 font-semibold">Price</th>
                                  <th className="pb-3 font-semibold text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {fontsList.map((font) => (
                                  <tr key={font.id} className="hover:bg-muted/30">
                                    <td className="py-3 font-medium text-foreground">{font.name}</td>
                                    <td className="py-3 text-muted-foreground">{font.category}</td>
                                    <td className="py-3 font-mono text-muted-foreground">{font.slug}</td>
                                    <td className="py-3 font-semibold text-foreground">{formatAed(font.price)}</td>
                                    <td className="py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingFont(font)}
                                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFont(font)}
                                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
                {settingSection === "payment_methods" && (
                  <PaymentMethodsPanel
                    methods={paymentMethods}
                    editingForm={editingPaymentMethod}
                    onChange={setEditingPaymentMethod}
                    onCreate={() => setEditingPaymentMethod({
                      name: "",
                      slug: "",
                      is_active: true,
                      sort_order: String((paymentMethods.at(-1)?.sort_order ?? 0) + 10),
                    })}
                    onEdit={(method) => setEditingPaymentMethod({
                      id: method.id,
                      name: method.name,
                      slug: method.slug,
                      is_active: method.is_active,
                      sort_order: String(method.sort_order),
                    })}
                    onCancel={() => setEditingPaymentMethod(null)}
                    onSave={savePaymentMethod}
                    onDelete={deletePaymentMethod}
                  />
                )}
                {settingSection !== "charges" && settingSection !== "payment_methods" && settingSection !== "fonts" && (
                  <SettingsCrudPanel
                    section={settingSection}
                    leagues={leagues}
                    rows={getActiveSettingRows()}
                    editingForm={editingSetting}
                    onChange={setEditingSetting}
                    onEdit={(item) => setEditingSetting(createSettingForm(settingSection, item))}
                    onCreate={() => setEditingSetting(createSettingForm(settingSection))}
                    onCancel={() => setEditingSetting(null)}
                    onSave={(form) => saveSetting(settingSection, form)}
                    onDelete={(item) => deleteSetting(settingSection, item)}
                  />
                )}
              </section>
            )}
          </>
        )}
      </main>

      {productImportPreview && (
        <ProductImportReviewModal
          preview={productImportPreview}
          fileName={productImportFileName}
          importing={importingProducts}
          onClose={() => {
            if (importingProducts) return;
            setProductImportPreview(null);
            setProductImportFileName("");
          }}
          onImport={handleConfirmProductImport}
        />
      )}
      {editingProduct && (
        <ProductEditor
          form={editingProduct}
          onChange={setEditingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={saveProduct}
          leagues={leagues}
          teams={teams}
          seasons={seasons}
          sizes={sizes}
        />
      )}
      {editingOrder && (
        <OrderEditor
          form={editingOrder}
          products={products}
          sizes={sizes}
          paymentMethods={paymentMethods}
          addOnPricing={addOnPricing}
          message={actionMessage}
          messageIsError={actionHasError}
          onChange={setEditingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={saveOrder}
        />
      )}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onEdit={(order) => {
            setViewingOrder(null);
            setEditingOrder(orderToForm(order));
          }}
          onPrint={(order) => {
            setViewingOrder(null);
            setPrintingOrder(order);
          }}
          onNotify={handleWhatsAppNotify}
          onEmailFontDelivery={handleEmailFontDelivery}
        />
      )}
      {printingOrder && (
        <PrintSlipPreview order={printingOrder} onClose={() => setPrintingOrder(null)} />
      )}
    </div>
  );
}

function LowStockPanel({
  items,
  onUpdateStock,
}: {
  items: {
    inventoryId: string;
    productName: string;
    kitName: string;
    size: string;
    quantity: number;
    reserved: number;
  }[];
  onUpdateStock: (inventoryId: string, newQuantity: number) => Promise<void>;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState<Record<string, string>>({});

  const handleSave = async (id: string) => {
    const val = inputVal[id];
    if (val === undefined || val.trim() === "") return;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setUpdatingId(id);
    try {
      await onUpdateStock(id, num);
      setInputVal((current) => ({ ...current, [id]: "" }));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Alerts</p>
          <h2 className="mt-1 text-lg font-bold text-destructive">Low Stock Warnings</h2>
        </div>
        <span className="flex size-7 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">
          {items.length}
        </span>
      </div>
      <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">All items are sufficiently stocked.</p>
        ) : (
          items.map((item) => (
            <article key={item.inventoryId} className="flex items-center justify-between gap-3 text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-foreground truncate">{item.productName}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {item.kitName} · Size: <strong className="text-foreground">{item.size}</strong>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Stock: <strong className="text-destructive">{item.quantity}</strong> {item.reserved > 0 && `(${item.reserved} reserved)`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="New qty"
                  value={inputVal[item.inventoryId] ?? ""}
                  onChange={(e) => setInputVal((curr) => ({ ...curr, [item.inventoryId]: e.target.value }))}
                  className="h-8 w-16 rounded border border-border bg-background px-2 text-center outline-none focus:border-primary text-xs"
                />
                <button
                  type="button"
                  disabled={updatingId === item.inventoryId || (inputVal[item.inventoryId] ?? "").trim() === ""}
                  onClick={() => handleSave(item.inventoryId)}
                  className="h-8 rounded bg-primary px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/95 transition-colors"
                >
                  {updatingId === item.inventoryId ? "..." : "Set"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function InventoryPanel({
  rows,
  query,
  stockFilter,
  totalRows,
  onQueryChange,
  onStockFilterChange,
  onUpdateStock,
}: {
  rows: {
    inventoryId: string;
    productId: string;
    productName: string;
    productStatus: ProductStatus;
    kitName: string;
    kit: KitVariant;
    sku: string | null;
    size: string;
    quantity: number;
    reserved: number;
    available: number;
    imagePath: string | null;
    variantAvailable: boolean;
  }[];
  query: string;
  stockFilter: "all" | "low" | "out";
  totalRows: number;
  onQueryChange: (value: string) => void;
  onStockFilterChange: (value: "all" | "low" | "out") => void;
  onUpdateStock: (inventoryId: string, newQuantity: number) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const groups = useMemo(() => {
    const grouped = new Map<string, {
      productId: string;
      productName: string;
      productStatus: ProductStatus;
      imagePath: string | null;
      rows: typeof rows;
      quantity: number;
      reserved: number;
      available: number;
      lowCount: number;
      outCount: number;
      kitTotals: Record<KitVariant, number>;
    }>();

    for (const row of rows) {
      const current = grouped.get(row.productId) ?? {
        productId: row.productId,
        productName: row.productName,
        productStatus: row.productStatus,
        imagePath: row.imagePath,
        rows: [],
        quantity: 0,
        reserved: 0,
        available: 0,
        lowCount: 0,
        outCount: 0,
        kitTotals: { home: 0, away: 0, third: 0 },
      };
      current.rows.push(row);
      current.quantity += row.quantity;
      current.reserved += row.reserved;
      current.available += row.available;
      current.kitTotals[row.kit] += row.available;
      if (row.available <= 0) current.outCount += 1;
      else if (row.available <= 8) current.lowCount += 1;
      if (!current.imagePath && row.imagePath) current.imagePath = row.imagePath;
      grouped.set(row.productId, current);
    }

    return Array.from(grouped.values());
  }, [rows]);

  const handleSave = async (row: { inventoryId: string; reserved: number }) => {
    const value = inputVal[row.inventoryId];
    if (value === undefined || value.trim() === "") return;
    const nextQuantity = Number.parseInt(value, 10);
    if (!Number.isFinite(nextQuantity) || nextQuantity < row.reserved) return;
    setUpdatingId(row.inventoryId);
    try {
      await onUpdateStock(row.inventoryId, nextQuantity);
      setInputVal((current) => ({ ...current, [row.inventoryId]: "" }));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Inventory</p>
          <h2 className="mt-1 text-lg font-bold">Stock by product</h2>
          <p className="mt-1 text-xs text-muted-foreground">Showing {rows.length} of {totalRows} active stock rows across {groups.length} products.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,260px)_150px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search inventory..."
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(event) => onStockFilterChange(event.target.value as "all" | "low" | "out")}
            className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
          >
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border">
        {groups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No inventory rows match the current filters.
          </div>
        ) : groups.map((group, index) => (
          <details
            key={group.productId}
            open={index === 0 || Boolean(query.trim()) || stockFilter !== "all"}
            className="group"
          >
            <summary className="grid cursor-pointer list-none gap-4 px-5 py-4 hover:bg-muted/20 lg:grid-cols-[minmax(0,1fr)_360px_160px_auto] lg:items-center [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={getPublicProductImage(group.imagePath)} alt={group.productName} fill sizes="56px" className="object-contain p-1" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{group.productName}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{group.productStatus} · {group.rows.length} size rows</p>
                  {(group.lowCount > 0 || group.outCount > 0) && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                      {group.lowCount > 0 && `${group.lowCount} low`}
                      {group.lowCount > 0 && group.outCount > 0 && " · "}
                      {group.outCount > 0 && `${group.outCount} out`}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {kitOptions.map((kit) => (
                  <div key={kit.id} className={`rounded-lg border px-3 py-2 ${group.kitTotals[kit.id] <= 0 ? "border-red-200 bg-red-50 text-red-700" : group.kitTotals[kit.id] <= 8 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-border bg-muted/30"}`}>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{kit.label.replace(" Kit", "")}</span>
                    <strong className="mt-1 block text-base">{group.kitTotals[kit.id]}</strong>
                  </div>
                ))}
              </div>
              <dl className="grid grid-cols-3 gap-3 text-right text-xs lg:grid-cols-1 lg:gap-1">
                <div><dt className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Qty</dt><dd className="font-bold">{group.quantity}</dd></div>
                <div><dt className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Reserved</dt><dd className="font-bold">{group.reserved}</dd></div>
                <div><dt className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Available</dt><dd className="font-bold">{group.available}</dd></div>
              </dl>
              <ChevronDown size={17} className="hidden text-muted-foreground transition-transform group-open:rotate-180 lg:block" />
            </summary>
            <div className="border-t border-border bg-muted/10 px-3 pb-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-4 py-3">Kit</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Reserved</th>
                      <th className="px-4 py-3 text-right">Available</th>
                      <th className="px-4 py-3">Set stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.rows.map((row) => {
                      const value = inputVal[row.inventoryId] ?? "";
                      const parsed = value.trim() ? Number.parseInt(value, 10) : null;
                      const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed < row.reserved);
                      const kitTone = getInventoryKitTone(row.kit);
                      return (
                        <tr key={row.inventoryId} className={kitTone.row}>
                          <td className={`border-l-4 px-4 py-4 ${kitTone.border}`}>
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${kitTone.badge}`}>
                              {row.kitName}
                            </span>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{row.sku ?? row.kit}</p>
                          </td>
                          <td className="px-4 py-4 font-bold">{row.size}</td>
                          <td className="px-4 py-4 text-right font-bold">{row.quantity}</td>
                          <td className="px-4 py-4 text-right">{row.reserved}</td>
                          <td className={`px-4 py-4 text-right font-bold ${row.available <= 0 ? "text-destructive" : row.available <= 8 ? "text-amber-700" : "text-foreground"}`}>
                            {row.available}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={row.reserved}
                                value={value}
                                onChange={(event) => setInputVal((current) => ({ ...current, [row.inventoryId]: event.target.value.replace(/\D/g, "") }))}
                                placeholder={`>= ${row.reserved}`}
                                className={`h-9 w-24 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary ${invalid ? "border-destructive" : "border-border"}`}
                              />
                              <button
                                type="button"
                                disabled={updatingId === row.inventoryId || !value.trim() || invalid}
                                onClick={() => handleSave(row)}
                                className="h-9 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {updatingId === row.inventoryId ? "..." : "Set"}
                              </button>
                            </div>
                            {invalid && <p className="mt-1 text-[10px] text-destructive">Must be at least reserved.</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function getInventoryKitTone(kit: KitVariant) {
  const tones: Record<KitVariant, { row: string; badge: string; border: string }> = {
    home: {
      row: "bg-sky-50/70 hover:bg-sky-100/70",
      badge: "border-sky-200 bg-sky-100 text-sky-800",
      border: "border-l-sky-400",
    },
    away: {
      row: "bg-emerald-50/70 hover:bg-emerald-100/70",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
      border: "border-l-emerald-400",
    },
    third: {
      row: "bg-amber-50/70 hover:bg-amber-100/70",
      badge: "border-amber-200 bg-amber-100 text-amber-800",
      border: "border-l-amber-400",
    },
  };
  return tones[kit];
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  attention,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: "dark";
  attention?: boolean;
}) {
  return (
    <article className={`rounded-xl border p-5 ${tone === "dark" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${tone === "dark" ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{label}</p>
          <strong className="mt-3 block text-2xl font-bold tracking-tight">{value}</strong>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-full ${tone === "dark" ? "bg-primary-foreground/10" : attention ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
          <Icon size={18} />
        </span>
      </div>
    </article>
  );
}

function OrdersPanel({
  orders: panelOrders,
  compact,
  onStatusChange,
  onDeliveryStatusChange,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onNotify,
}: {
  orders: DbOrder[];
  compact?: boolean;
  onStatusChange: (order: DbOrder, status: OrderStatus) => void;
  onDeliveryStatusChange: (order: DbOrder, status: DeliveryStatus) => void;
  onView?: (order: DbOrder) => void;
  onEdit?: (order: DbOrder) => void;
  onDelete?: (order: DbOrder) => void;
  onPrint?: (order: DbOrder) => void;
  onNotify?: (order: DbOrder) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Orders</p>
          <h2 className="mt-1 text-lg font-bold">Customer queue</h2>
        </div>
        {compact && <ChevronRight size={18} className="text-muted-foreground" />}
      </div>
      <div className="divide-y divide-border">
        {panelOrders.length === 0 ? (
          <EmptyRow label="No orders in Supabase yet." />
        ) : panelOrders.map((order) => {
          const itemCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
          return (
            <article key={order.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{order.order_number}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${getDeliveryStatusClass(order.delivery_status ?? "pending")}`}>
                    {deliveryStatusOptions.find((status) => status.id === (order.delivery_status ?? "pending"))?.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {order.customer_name} · {order.customer_phone} · {order.region}, {order.country}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.created_at)} · {itemCount} item{itemCount === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-3 lg:justify-end">
                <span className="rounded-full bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                  {getOrderPaymentMethodLabel(order.payment_method, order.payment_method_name)}
                </span>
                <strong className="text-lg">{formatAed(order.total)}</strong>
              </div>
              {/* <select
                value={getPaymentStatusValue(order.status)}
                onChange={(event) => onStatusChange(order, event.target.value as OrderStatus)}
                className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
              >
                {orderStatusOptions.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
              <select
                value={order.delivery_status ?? "pending"}
                onChange={(event) => onDeliveryStatusChange(order, event.target.value as DeliveryStatus)}
                className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50 lg:col-start-3"
              >
                {deliveryStatusOptions.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select> */}
              {!compact && (
                <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
                  {onNotify && (
                    <button type="button" onClick={() => onNotify(order)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-emerald-500 hover:text-emerald-600">
                      <WhatsAppIcon className="size-3.5 text-emerald-600" /> Notify
                    </button>
                  )}
                  {onView && (
                    <button type="button" onClick={() => onView(order)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50">
                      <Eye size={12} /> View
                    </button>
                  )}
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(order)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  {onPrint && (
                    <button type="button" onClick={() => onPrint(order)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50">
                      <Printer size={12} /> Slip
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(order)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductsPanel({
  rows,
  sizes: availableSizes,
  compact,
  actions,
  onEdit,
  onDelete,
}: {
  rows: { product: DbProduct; stock: Record<KitVariant, number>; totalStock: number; sizes: string[] }[];
  sizes: DbJerseySize[];
  compact?: boolean;
  actions?: React.ReactNode;
  onEdit: (form: ProductFormState) => void;
  onDelete: (product: DbProduct) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Products</p>
          <h2 className="mt-1 text-lg font-bold">Jersey stock</h2>
        </div>
        {actions ?? (compact && <ChevronRight size={18} className="text-muted-foreground" />)}
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <EmptyRow label="No products in Supabase yet. Use Add Product to create one." />
        ) : rows.map(({ product, stock, totalStock, sizes }) => {
          const firstVariant = product.product_variants?.find((variant) => variant.image_front_path) ?? product.product_variants?.[0];
          return (
            <article key={product.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)_auto] lg:items-center">
              <div className="flex min-w-0 gap-4">
                <div className="relative h-20 w-16 shrink-0 rounded-lg bg-muted">
                  <Image src={getPublicProductImage(firstVariant?.image_front_path)} alt={product.name} fill sizes="64px" className="object-contain p-1" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {product.leagues?.name ?? product.category} · {product.seasons?.name ?? product.season ?? "No season"}
                  </p>
                  <h3 className="mt-1 truncate font-bold">{product.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{totalStock} total units · {(sizes.length ? sizes : ["No sizes"]).join(" / ")}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{product.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {kitOptions.map((kit) => {
                  const count = stock[kit.id];
                  return (
                    <div key={kit.id} className={`rounded-lg border px-3 py-2 ${count === 0 ? "border-destructive/20 bg-destructive/5" : count <= 3 ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30"}`}>
                      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{kit.label.replace(" Kit", "")}</span>
                      <strong className="mt-1 block text-base">{count}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(productToForm(product, availableSizes))}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50"
                >
                  <Edit3 size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductImportReviewModal({
  preview,
  fileName,
  importing,
  onClose,
  onImport,
}: {
  preview: ProductImportPreview;
  fileName: string;
  importing: boolean;
  onClose: () => void;
  onImport: () => void;
}) {
  const hasIssues = preview.issues.length > 0;
  const canImport = !hasIssues && preview.rows.length > 0 && !importing;
  const sampleRows = preview.rows.slice(0, 6);

  return (
    <div className="fixed inset-0 z-[75] bg-black/45 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Product Import</p>
            <h2 className="mt-1 truncate text-xl font-bold">{fileName || "Excel review"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ImportStat label="Rows" value={preview.totalRows.toString()} />
            <ImportStat label="Valid" value={preview.validRows.toString()} />
            <ImportStat label="New" value={preview.createCount.toString()} />
            <ImportStat label="Updates" value={preview.updateCount.toString()} />
            <ImportStat label="Errors" value={preview.issues.length.toString()} attention={hasIssues} />
          </div>

          {hasIssues ? (
            <section className="mt-5 rounded-xl border border-destructive/25 bg-destructive/5">
              <div className="border-b border-destructive/20 px-4 py-3">
                <h3 className="text-sm font-bold text-destructive">Fix these rows before importing</h3>
              </div>
              <div className="divide-y divide-destructive/10">
                {preview.issues.slice(0, 14).map((issue, index) => (
                  <div key={`${issue.rowNumber}-${issue.field}-${index}`} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[120px_160px_minmax(0,1fr)]">
                    <span className="font-bold text-destructive">Row {issue.rowNumber}</span>
                    <span className="font-mono text-xs text-muted-foreground">{issue.field}</span>
                    <span className="text-foreground">{issue.message}</span>
                  </div>
                ))}
              </div>
              {preview.issues.length > 14 && (
                <p className="border-t border-destructive/20 px-4 py-3 text-xs text-muted-foreground">
                  {preview.issues.length - 14} more issues hidden.
                </p>
              )}
            </section>
          ) : (
            <section className="mt-5 overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <h3 className="font-bold">Ready to import</h3>
                <p className="mt-1 text-xs text-muted-foreground">Review the first rows before saving them to Supabase.</p>
              </div>
              {sampleRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No product rows found in the workbook.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">League</th>
                        <th className="px-4 py-3">Season</th>
                        <th className="px-4 py-3">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sampleRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold">{row.name}</p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.slug}</p>
                          </td>
                          <td className="px-4 py-3">{row.leagueName}</td>
                          <td className="px-4 py-3">{row.seasonName}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]">
                              {row.existingProductId ? `Update ${row.matchedBy}` : "Create"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="h-11 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={!canImport}
            className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Products"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportStat({ label, value, attention }: { label: string; value: string; attention?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${attention ? "border-destructive/25 bg-destructive/5" : "border-border bg-muted/20"}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <strong className={attention ? "mt-1 block text-xl text-destructive" : "mt-1 block text-xl text-foreground"}>{value}</strong>
    </div>
  );
}

function PaymentsPanel({
  proofs,
  onStatusChange,
}: {
  proofs: DbPaymentProof[];
  onStatusChange: (proof: DbPaymentProof, status: PaymentStatus) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Payments</p>
          <h2 className="mt-1 text-lg font-bold">Reference review</h2>
        </div>
        <BadgeCheck size={18} className="text-muted-foreground" />
      </div>
      <div className="divide-y divide-border">
        {proofs.length === 0 ? (
          <EmptyRow label="No payment references in Supabase yet." />
        ) : proofs.map((proof) => (
          <article key={proof.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{proof.orders?.order_number ?? proof.order_id}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{proof.orders?.customer_name ?? "Unknown customer"} · {getPaymentLabel(proof.provider)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${proof.status === "pending" ? "bg-amber-50 text-amber-700" : proof.status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {proof.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">AED order</dt>
                <dd className="mt-1 font-bold">{formatAed(proof.orders?.total ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Paid amount</dt>
                <dd className="mt-1 font-bold">{formatAed(proof.amount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Transaction: {proof.transaction_id} · {formatDateTime(proof.created_at)}</p>
            {proof.status === "pending" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onStatusChange(proof, "verified")}
                  className="h-10 rounded-full bg-primary text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(proof, "rejected")}
                  className="h-10 rounded-full border border-border text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive"
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function PrintPanel({ orders }: { orders: DbOrder[] }) {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border border-border bg-background p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Print center</p>
        <h2 className="mt-1 text-lg font-bold">Invoices and labels</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pick an order, preview invoice and sticker label, then print. Final paper and sticker dimensions can be adjusted later.
        </p>

        <label className="mt-5 grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Order
          <select
            value={selectedOrder?.id ?? ""}
            onChange={(event) => setSelectedOrderId(event.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
          >
            {orders.length === 0 ? (
              <option value="">No orders</option>
            ) : orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number} - {order.customer_name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            disabled={!selectedOrder}
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} /> Print invoice
          </button>
          <button
            type="button"
            disabled={!selectedOrder}
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} /> Print label
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-5">
        {selectedOrder ? (
          <div id="admin-print-document" className="mx-auto grid max-w-4xl gap-5 bg-white text-black print:block">
            <article className="rounded-lg border border-neutral-300 p-6 print:rounded-none print:border-0 print:p-0">
              <div className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-5">
                <div className="flex items-center gap-3">
                  <Image src="/assets/tisa-logo.png" alt="TISA logo" width={48} height={48} className="rounded-lg" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Invoice</p>
                    <h2 className="mt-1 text-2xl font-bold">TISA Sportwears</h2>
                    {/* <p className="mt-1 text-sm text-neutral-600">Premium match jersey showroom</p> */}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{selectedOrder.order_number}</p>
                  <p className="mt-1 text-sm text-neutral-600">{formatDateTime(selectedOrder.created_at)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-neutral-500">{getStatusLabel(selectedOrder.status)}</p>
                </div>
              </div>

              <div className="grid gap-5 border-b border-neutral-300 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Bill to</p>
                  <p className="mt-2 font-bold">{selectedOrder.customer_name}</p>
                  <p className="mt-1 text-sm text-neutral-700">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && <p className="mt-1 text-sm text-neutral-700">{selectedOrder.customer_email}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Deliver to</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    {selectedOrder.delivery_address}<br />
                    {selectedOrder.region}, {selectedOrder.country}
                  </p>
                </div>
              </div>

              <table className="mt-5 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="py-2">Item</th>
                    <th className="py-2">Kit</th>
                    <th className="py-2">Size</th>
                    <th className="py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.order_items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-neutral-200">
                      <td className="py-3">
                        <p className="font-medium">{item.product_name}</p>
                        {(item.custom_name || item.custom_number) && (
                          <p className="mt-1 text-xs text-neutral-600">Customize Name &amp; Number x {item.quantity}</p>
                        )}
                        {item.arm_badge && (
                          <p className="mt-1 text-xs text-neutral-600">Arm Badge x {item.quantity}</p>
                        )}
                      </td>
                      <td className="py-3">{item.kit_name}</td>
                      <td className="py-3">{item.size}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto mt-5 w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><strong>{formatAed(selectedOrder.subtotal)}</strong></div>
                <div className="flex justify-between"><span>Delivery</span><strong>{formatAed(selectedOrder.delivery_fee)}</strong></div>
                <div className="flex justify-between border-t border-neutral-300 pt-2 text-lg"><span>Total</span><strong>{formatAed(selectedOrder.total)}</strong></div>
              </div>
            </article>

            <article className="max-w-md rounded-lg border-2 border-dashed border-neutral-400 p-5 print:mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Shipping label</p>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedOrder.customer_name}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    {selectedOrder.delivery_address}<br />
                    {selectedOrder.region}, {selectedOrder.country}
                  </p>
                  <p className="mt-3 font-bold">{selectedOrder.customer_phone}</p>
                </div>
                <div className="rounded border border-neutral-300 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Order</p>
                  <p className="font-bold">{selectedOrder.order_number}</p>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <EmptyRow label="No order available for printing." />
        )}
      </section>
    </section>
  );
}

function OrderEditor({
  form,
  products,
  sizes,
  paymentMethods,
  addOnPricing,
  message,
  messageIsError,
  onChange,
  onClose,
  onSave,
}: {
  form: OrderFormState;
  products: DbProduct[];
  sizes: DbJerseySize[];
  paymentMethods: DbPaymentMethod[];
  addOnPricing: AddOnPricing;
  message: string;
  messageIsError: boolean;
  onChange: (form: OrderFormState) => void;
  onClose: () => void;
  onSave: (form: OrderFormState) => Promise<void>;
}) {
  const [savingOrder, setSavingOrder] = useState(false);
  const setField = <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => onChange({ ...form, [key]: value });
  const availableRegions = deliveryRegions[form.country as keyof typeof deliveryRegions] ?? [];

  const setItem = (index: number, patch: Partial<OrderItemFormState>) => {
    onChange({
      ...form,
      items: form.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    });
  };

  const applyProduct = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);
    const firstVariant = product?.product_variants?.[0];
    const firstSize = firstVariant?.inventory?.find(isInventoryActive)?.size;
    setItem(index, {
      product_id: productId,
      variant_id: firstVariant?.id ?? "",
      kit: firstVariant?.kit ?? "home",
      product_name: product?.name ?? "",
      kit_name: firstVariant?.name ?? "Home Kit",
      unit_price: String(firstVariant?.price ?? product?.base_price ?? 0),
      size: firstSize ?? sortByOrder(sizes)[0]?.label ?? "",
    });
  };

  const applyVariant = (index: number, variantId: string) => {
    const product = products.find((item) => item.product_variants?.some((variant) => variant.id === variantId));
    const variant = product?.product_variants?.find((item) => item.id === variantId);
    const firstSize = variant?.inventory?.find(isInventoryActive)?.size;
    setItem(index, {
      product_id: product?.id ?? "",
      variant_id: variantId,
      kit: variant?.kit ?? "home",
      product_name: product?.name ?? "",
      kit_name: variant?.name ?? "",
      unit_price: String(variant?.price ?? product?.base_price ?? 0),
      size: firstSize ?? "",
    });
  };

  const handleSave = async () => {
    setSavingOrder(true);
    try {
      await onSave(form);
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Order CRUD</p>
            <h2 className="mt-1 text-xl font-bold">{form.id ? "Edit order" : "Add order"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full border border-border">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {message && (
            <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${messageIsError ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted/40 text-muted-foreground"}`}>
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Order no." value={form.order_number} onChange={(value) => setField("order_number", value)} />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Payment method
              <select value={form.payment_method} onChange={(event) => setField("payment_method", event.target.value as OrderPaymentMethod)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {paymentMethods
                  .filter((method) => method.is_active || method.slug === form.payment_method)
                  .map((method) => <option key={method.id} value={method.slug}>{method.name}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Payment status
              <select value={getPaymentStatusValue(form.status)} onChange={(event) => setField("status", event.target.value as OrderStatus)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {orderStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Delivery status
              <select value={form.delivery_status} onChange={(event) => setField("delivery_status", event.target.value as DeliveryStatus)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {deliveryStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
            <FormField label="Customer" value={form.customer_name} onChange={(value) => setField("customer_name", value)} />
            <FormField label="Phone" value={form.customer_phone} onChange={(value) => setField("customer_phone", value)} />
            <FormField label="Email" value={form.customer_email} onChange={(value) => setField("customer_email", value)} />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Country
              <select
                value={form.country}
                onChange={(event) => onChange({ ...form, country: event.target.value, region: "" })}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
              >
                {Object.keys(deliveryRegions).map((country) => <option key={country}>{country}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Region
              <select
                value={form.region}
                onChange={(event) => setField("region", event.target.value)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
              >
                <option value="">Select region</option>
                {availableRegions.map((region) => <option key={region}>{region}</option>)}
              </select>
            </label>
            <FormField label="Delivery fee" value={form.delivery_fee} type="number" onChange={(value) => setField("delivery_fee", value)} />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:col-span-2">
              Delivery address
              <textarea value={form.delivery_address} onChange={(event) => setField("delivery_address", event.target.value)} rows={3} className="resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:col-span-2">
              Admin note
              <textarea value={form.admin_note} onChange={(event) => setField("admin_note", event.target.value)} rows={3} className="resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none focus:border-primary" />
            </label>
          </div>

          <section className="mt-6 rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <h3 className="font-bold">Order items</h3>
              <button type="button" onClick={() => setField("items", [...form.items, createEmptyOrderItem()])} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em]">
                <Plus size={12} /> Item
              </button>
            </div>
            <div className="space-y-4 p-4">
              {form.items.map((item, index) => {
                const product = products.find((productItem) => productItem.id === item.product_id);
                const variant = product?.product_variants?.find((variantItem) => variantItem.id === item.variant_id);
                const itemSizes = variant?.inventory?.filter(isInventoryActive).map((row) => row.size) ?? sortByOrder(sizes).map((size) => size.label);
                return (
                  <article key={index} className="space-y-3 rounded-lg bg-muted/30 p-4">
                    <div className="grid items-end gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="grid min-w-0 gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Product
                      <select value={item.product_id} onChange={(event) => applyProduct(index, event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                        <option value="">Select product</option>
                        {products.map((productItem) => <option key={productItem.id} value={productItem.id}>{productItem.name}</option>)}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Kit
                      <select value={item.variant_id} onChange={(event) => applyVariant(index, event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                        <option value="">Select kit</option>
                        {(product?.product_variants ?? []).map((variantItem) => <option key={variantItem.id} value={variantItem.id}>{variantItem.name}</option>)}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Size
                      <select value={item.size} onChange={(event) => setItem(index, { size: event.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                        <option value="">Size</option>
                        {itemSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </label>
                    </div>
                    <div className="grid items-end gap-3 md:grid-cols-3">
                    <div className="min-w-0">
                      <FormField label="Qty" value={item.quantity} type="number" onChange={(value) => setItem(index, { quantity: value })} />
                    </div>
                    <div className="min-w-0">
                      <FormField label="Unit price" value={item.unit_price} type="number" onChange={(value) => setItem(index, { unit_price: value })} />
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Line total</span>
                      <div className="flex h-11 items-center justify-end rounded-lg border border-border bg-background px-4">
                        <strong className="text-sm">{formatAed(getOrderItemTotal(item, addOnPricing))}</strong>
                      </div>
                    </div>
                    </div>
                    <div className="flex items-start gap-3">
                    <details className="group min-w-0 flex-1 rounded-lg border border-border bg-background">
                      <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-4 text-[10px] font-bold uppercase tracking-[0.12em]">
                        <span>Additional</span>
                        <span className="text-muted-foreground group-open:hidden">Add options</span>
                        <span className="text-muted-foreground group-open:inline">Close</span>
                      </summary>
                      <div className="grid gap-3 border-t border-border p-4 md:grid-cols-3">
                        <FormField label={`Customized name (+${formatAed(addOnPricing.customization)})`} value={item.custom_name} onChange={(value) => setItem(index, { custom_name: value.toUpperCase().slice(0, 12) })} />
                        <FormField label="Number" value={item.custom_number} onChange={(value) => setItem(index, { custom_number: value.replace(/\D/g, "").slice(0, 2) })} />
                        <label className="grid min-w-0 gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Arm badge (+{formatAed(addOnPricing.armBadge)})
                          <select value={item.arm_badge} onChange={(event) => setItem(index, { arm_badge: event.target.value as ArmBadge })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                            <option value="">No badge</option>
                            <option value="ucl">UCL Badge</option>
                            <option value="epl">EPL Badge</option>
                          </select>
                        </label>
                      </div>
                    </details>
                    <button type="button" onClick={() => setField("items", form.items.filter((_, itemIndex) => itemIndex !== index))} className="h-11 shrink-0 rounded-lg border border-border px-5 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive">
                      Remove
                    </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]">Cancel</button>
          <button type="button" onClick={handleSave} disabled={savingOrder} className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">
            {savingOrder ? "Saving..." : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onEdit,
  onPrint,
  onNotify,
  onEmailFontDelivery,
}: {
  order: DbOrder;
  onClose: () => void;
  onEdit: (order: DbOrder) => void;
  onPrint: (order: DbOrder) => void;
  onNotify?: (order: DbOrder) => void;
  onEmailFontDelivery?: (order: DbOrder) => void;
}) {
  const hasFontItems = (order.order_items ?? []).some((item) => item.size === "Font File");
  const canDeliverFonts = hasFontItems && order.status === "paid";

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Order detail</p>
            <h2 className="mt-1 text-xl font-bold">{order.order_number}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full border border-border"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-bold">Customer</h3>
              <p className="mt-3 text-sm font-semibold">{order.customer_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{order.customer_phone}</p>
              {order.customer_email && <p className="mt-1 text-sm text-muted-foreground">{order.customer_email}</p>}
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{order.delivery_address}<br />{order.region}, {order.country}</p>
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-bold">Payment</h3>
              <p className="mt-3 text-sm text-muted-foreground">Status: {getStatusLabel(order.status)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Method: {getOrderPaymentMethodLabel(order.payment_method, order.payment_method_name)}</p>
              <p className="mt-3 text-xl font-bold">{formatAed(order.total)}</p>
            </section>
          </div>
          <section className="mt-5 rounded-xl border border-border">
            <div className="border-b border-border p-4"><h3 className="font-bold">Items</h3></div>
            <div className="divide-y divide-border">
              {(order.order_items ?? []).map((item) => (
                <div key={item.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.kit_name} / {item.size} / Qty {item.quantity}</p>
                    {(item.custom_name || item.custom_number) && <p className="mt-1 text-xs text-muted-foreground">Print: {item.custom_name || "-"} #{item.custom_number || "-"} · +{formatAed(item.customization_fee)}</p>}
                    {item.font_slug && <p className="mt-1 text-xs text-muted-foreground">Font: {item.font_slug}</p>}
                    {item.arm_badge && <p className="mt-1 text-xs text-muted-foreground">{item.arm_badge.toUpperCase()} Badge · +{formatAed(item.arm_badge_fee)}</p>}
                  </div>
                  <strong>{formatAed(item.line_total)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-xl border border-border bg-background p-4">
            <h3 className="font-bold border-b border-border pb-3 mb-4">Status Timeline</h3>
            {(!order.order_status_history || order.order_status_history.length === 0) ? (
              <p className="text-xs text-muted-foreground">No history recorded yet.</p>
            ) : (
              <div className="relative border-l border-border pl-4 space-y-5 py-2">
                {[...order.order_status_history]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary" />
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground">
                            {getBurmeseOrderStatus(log.to_status)}
                          </span>
                          {log.from_status && (
                            <span className="text-[10px] text-muted-foreground">
                              ({getBurmeseOrderStatus(log.from_status)} မှ)
                            </span>
                          )}
                        </div>
                        {log.note && (
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {log.note}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground/80 mt-0.5">
                          <time dateTime={log.created_at}>{formatDateTime(log.created_at)}</time>
                          {log.profiles?.display_name && (
                            <>
                              <span>·</span>
                              <span>By: {log.profiles.display_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-border p-5">
          {onNotify && (
            <button type="button" onClick={() => onNotify(order)} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em] hover:border-emerald-500 hover:text-emerald-600">
              <WhatsAppIcon className="size-3.5 text-emerald-600" /> Notify WhatsApp
            </button>
          )}
          {onEmailFontDelivery && canDeliverFonts && (
            <button type="button" onClick={() => onEmailFontDelivery(order)} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em] hover:border-primary/50 hover:text-primary">
              <Mail size={13} /> Notify by email
            </button>
          )}
          <button type="button" onClick={() => onEdit(order)} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]"><Edit3 size={13} /> Edit</button>
          <button type="button" onClick={() => onPrint(order)} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"><Printer size={13} /> Preview slip</button>
        </div>
      </div>
    </div>
  );
}

function PrintSlipPreview({ order, onClose }: { order: DbOrder; onClose: () => void }) {
  const [size, setSize] = useState<PrintSlipSize>("rp425-4x6");
  const selectedSize = printSlipSizes.find((item) => item.id === size) ?? printSlipSizes[0];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <style>{`
        @media print {
          html, body {
            width: ${selectedSize.width} !important;
            height: ${selectedSize.minHeight} !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          body * { visibility: hidden !important; }
          body *:not(:has(#print-slip-document)):not(#print-slip-document):not(#print-slip-document *) {
            display: none !important;
          }
          body *:has(#print-slip-document) {
            position: static !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #print-slip-document, #print-slip-document * { visibility: visible !important; }
          #print-slip-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${selectedSize.width} !important;
            height: ${selectedSize.minHeight} !important;
            min-height: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            break-after: avoid-page !important;
            break-inside: avoid-page !important;
          }
          @page { size: ${selectedSize.pageSize}; margin: 0; }
        }
      `}</style>
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_1fr]">
        <section className="h-fit rounded-xl bg-background p-5 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Print preview</p>
          <h2 className="mt-1 text-xl font-bold">Voucher slip</h2>
          <label className="mt-5 grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Slip size
            <select value={size} onChange={(event) => setSize(event.target.value as PrintSlipSize)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
              {printSlipSizes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            RP425 driver မှာ 4×6 inch (101.6 × 152.4 mm), Portrait၊ Scale 100% နဲ့ Margins None ကိုရွေးပါ။
          </p>
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => window.print()} className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">Print Slip</button>
            <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]">Close</button>
          </div>
        </section>

        <section className="overflow-auto rounded-xl bg-neutral-200 p-5">
          <article
            id="print-slip-document"
            className="mx-auto box-border bg-white p-[5mm] text-black shadow-xl"
            style={{ width: selectedSize.width, minHeight: selectedSize.minHeight }}
          >
            <div className="flex items-center gap-3 border-b border-neutral-300 pb-4">
              <Image src="/assets/tisa-logo.png" alt="TISA logo" width={42} height={42} className="rounded-md" />
              <div>
                <h1 className="text-xl font-black tracking-[0.08em]">TISA Sportwears</h1>
                <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500">Order slip</p>
              </div>
            </div>
            <div className="grid gap-3 border-b border-neutral-300 py-4 text-xs">
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Order No</span><strong>{order.order_number}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Date</span><strong>{formatDateTime(order.created_at)}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Customer</span><strong className="text-right">{order.customer_name}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Phone</span><strong>{order.customer_phone}</strong></div>
              <div className="grid gap-1">
                <span className="text-neutral-500">Address</span>
                <strong className="leading-5">
                  {order.delivery_address}<br />{order.region}, {order.country}
                </strong>
              </div>
            </div>
            <div className="border-b border-neutral-300 py-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Items</h2>
              <div className="mt-2 space-y-2">
                {(order.order_items ?? []).map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 text-xs">
                    <div>
                      <p className="font-semibold">{item.product_name} × {item.quantity}</p>
                      <p className="mt-1 text-[10px] text-neutral-600">
                        Size: {item.size}{(item.custom_name || item.custom_number) && <> <span className="px-1">|</span> Customize Name &amp; Number x {item.quantity}</>}
                      </p>
                      {item.arm_badge && (
                        <p className="mt-1 text-[10px] text-neutral-600">
                          Arm Badge x {item.quantity}
                        </p>
                      )}
                    </div>
                    {/* <strong>{formatAed(item.line_total)}</strong> */}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-3 py-4 text-sm">
              <span className="text-neutral-500">Payment Method</span>
              <strong>{getOrderPaymentMethodLabel(order.payment_method, order.payment_method_name)}</strong>
            </div>
            <div className="border-t border-neutral-300 pt-3 text-center">
              <p className="text-[10px] font-semibold">Thank you for shopping with TISA.</p>
              <p className="mt-1 text-[9px] text-neutral-500">Please keep this voucher for your order reference.</p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function PaymentMethodsPanel({
  methods,
  editingForm,
  onChange,
  onCreate,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  methods: DbPaymentMethod[];
  editingForm: PaymentMethodFormState | null;
  onChange: (form: PaymentMethodFormState) => void;
  onCreate: () => void;
  onEdit: (method: DbPaymentMethod) => void;
  onCancel: () => void;
  onSave: (form: PaymentMethodFormState) => void;
  onDelete: (method: DbPaymentMethod) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
          <h2 className="mt-1 text-lg font-bold">Payment Methods</h2>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
          <Plus size={13} /> Add
        </button>
      </div>

      {editingForm && (
        <div className="border-b border-border p-5">
          <div className="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              label="Display name"
              value={editingForm.name}
              onChange={(value) => onChange({
                ...editingForm,
                name: value,
                slug: editingForm.id ? editingForm.slug : slugify(value),
              })}
            />
            <FormField label="Slug" value={editingForm.slug} onChange={(value) => onChange({ ...editingForm, slug: slugify(value) })} />
            <FormField label="Order" value={editingForm.sort_order} type="number" onChange={(value) => onChange({ ...editingForm, sort_order: value })} />
            <label className="flex h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm">
              <input type="checkbox" checked={editingForm.is_active} onChange={(event) => onChange({ ...editingForm, is_active: event.target.checked })} />
              Active
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="h-10 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.12em]">Cancel</button>
            <button type="button" onClick={() => onSave(editingForm)} className="h-10 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">Save</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {methods.length === 0 ? (
          <EmptyRow label="No payment methods yet." />
        ) : methods.map((method) => (
          <article key={method.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{method.name}</h3>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${
                  method.is_active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                }`}>
                  {method.is_active ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{method.slug} · Order {method.sort_order}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onEdit(method)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em]">
                <Edit3 size={12} /> Edit
              </button>
              <button type="button" onClick={() => onDelete(method)} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsCrudPanel({
  section,
  leagues,
  rows,
  editingForm,
  onChange,
  onCreate,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  section: SettingSection;
  leagues: DbLeague[];
  rows: (DbLeague | DbSeason | DbJerseySize | DbTeam)[];
  editingForm: SettingFormState | null;
  onChange: (form: SettingFormState) => void;
  onCreate: () => void;
  onEdit: (item: DbLeague | DbSeason | DbJerseySize | DbTeam) => void;
  onCancel: () => void;
  onSave: (form: SettingFormState) => void;
  onDelete: (item: DbLeague | DbSeason | DbJerseySize | DbTeam) => void;
}) {
  const title = getSettingTitle(section);
  const isSize = section === "sizes";
  const isTeam = section === "teams";

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
          <h2 className="mt-1 text-lg font-bold">{title} CRUD</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {editingForm && (
        <div className="border-b border-border p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isSize ? (
              <FormField label="Size label" value={editingForm.label} onChange={(value) => onChange({ ...editingForm, label: value })} />
            ) : (
              <>
                <FormField
                  label="Name"
                  value={editingForm.name}
                  onChange={(value) => onChange({ ...editingForm, name: value, slug: editingForm.slug || slugify(value) })}
                />
                <FormField label="Slug" value={editingForm.slug} onChange={(value) => onChange({ ...editingForm, slug: value })} />
              </>
            )}
            {isTeam && (
              <>
                <SearchSelectField
                  label="League"
                  value={editingForm.league_id}
                  options={leagues.map((league) => ({ id: league.id, label: league.name }))}
                  onChange={(leagueId) => onChange({ ...editingForm, league_id: leagueId })}
                />
                <FormField label="Country" value={editingForm.country} onChange={(value) => onChange({ ...editingForm, country: value })} />
              </>
            )}
            <FormField label="Order" value={editingForm.sort_order} type="number" onChange={(value) => onChange({ ...editingForm, sort_order: value })} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="h-10 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.12em]">
              Cancel
            </button>
            <button type="button" onClick={() => onSave(editingForm)} className="h-10 rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
              Save
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <EmptyRow label={`No ${title.toLowerCase()} yet.`} />
        ) : rows.map((row) => {
          const isRowSize = "label" in row;
          const isRowTeam = "country" in row;
          const label = isRowSize ? row.label : row.name;
          const detail = isRowTeam
            ? [row.leagues?.name, row.country].filter(Boolean).join(" · ") || "No league"
            : !isRowSize
              ? row.slug
              : `Order ${row.sort_order}`;

          return (
            <article key={row.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h3 className="font-bold">{label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary/50"
                >
                  <Edit3 size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductEditor({
  form,
  onChange,
  onClose,
  onSave,
  leagues,
  teams,
  seasons,
  sizes,
}: {
  form: ProductFormState;
  onChange: (form: ProductFormState) => void;
  onClose: () => void;
  onSave: (form: ProductFormState) => void;
  leagues: DbLeague[];
  teams: DbTeam[];
  seasons: DbSeason[];
  sizes: DbJerseySize[];
}) {
  const [uploadingField, setUploadingField] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const selectedLeagueTeams = form.league_id ? teams.filter((team) => team.league_id === form.league_id) : teams;
  const selectedSizes = sortByOrder(sizes).filter((size) => form.size_ids.includes(size.id));

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    onChange({ ...form, [key]: value });
  };

  const setVariant = (kit: KitVariant, patch: Partial<VariantFormState>) => {
    onChange({
      ...form,
      variants: {
        ...form.variants,
        [kit]: { ...form.variants[kit], ...patch },
      },
    });
  };

  const toggleSize = (sizeId: string) => {
    const nextSizeIds = form.size_ids.includes(sizeId)
      ? form.size_ids.filter((id) => id !== sizeId)
      : [...form.size_ids, sizeId];
    setField("size_ids", nextSizeIds);
  };

  const setVariantStock = (kit: KitVariant, size: string, value: string) => {
    const sanitizedValue = value.replace(/\D/g, "");
    setVariant(kit, {
      stockBySize: {
        ...form.variants[kit].stockBySize,
        [size]: sanitizedValue,
      },
    });
  };

  const uploadVariantImage = async (kit: KitVariant, side: "front" | "back" | "arm", file: File) => {
    if (!allowedProductImageTypes.has(file.type)) {
      window.alert("Only JPG, PNG, and WebP product images are allowed.");
      return;
    }

    if (file.size > maxProductImageBytes) {
      window.alert("Product images must be 10 MB or smaller.");
      return;
    }

    setUploadingField(`${kit}-${side}`);
    setUploadMessage("");
    const supabase = createSupabaseBrowserClient();
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[file.type];
    const productSlug = form.slug.trim() || slugify(form.name) || "product";
    const safeProductSlug = slugify(productSlug) || "product";
    const path = `products/${safeProductSlug}/${kit}/${side}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (!error) {
      const pathPatch = side === "front"
        ? { image_front_path: path }
        : side === "back"
          ? { image_back_path: path }
          : { image_arm_path: path };
      setVariant(kit, pathPatch);
      setUploadMessage(`${kitOptions.find((option) => option.id === kit)?.label} ${side} image uploaded. Save Product to attach it.`);
    } else {
      setUploadMessage(`Upload failed: ${error.message}`);
      window.alert(error.message);
    }
    setUploadingField("");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 p-4 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Product CRUD</p>
            <h2 className="mt-1 text-xl font-bold">{form.id ? "Edit product" : "Add product"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full border border-border">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {uploadMessage && (
            <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              uploadMessage.startsWith("Upload failed")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}>
              {uploadMessage}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name" value={form.name} onChange={(value) => {
              setField("name", value);
              if (!form.id && !form.slug) setField("slug", slugify(value));
            }} />
            <FormField label="Slug" value={form.slug} onChange={(value) => setField("slug", value)} />
            <SearchSelectField
              label="League"
              value={form.league_id}
              options={leagues.map((league) => ({ id: league.id, label: league.name }))}
              onChange={(leagueId) => {
                const keepTeam = form.team_id && teams.some((team) => team.id === form.team_id && team.league_id === leagueId);
                onChange({ ...form, league_id: leagueId, team_id: keepTeam ? form.team_id : "" });
              }}
            />
            <SearchSelectField
              label="Team"
              value={form.team_id}
              options={selectedLeagueTeams.map((team) => ({
                id: team.id,
                label: team.leagues?.name ? `${team.name} (${team.leagues.name})` : team.name,
                searchText: [team.name, team.country, team.leagues?.name].filter(Boolean).join(" "),
              }))}
              onChange={(teamId) => setField("team_id", teamId)}
            />
            <FormField label="Collection" value={form.collection} onChange={(value) => setField("collection", value)} />
            <FormField label="Base price" value={form.base_price} type="number" onChange={(value) => setField("base_price", value)} />
            <SearchSelectField
              label="Season"
              value={form.season_id}
              options={seasons.map((season) => ({ id: season.id, label: season.name }))}
              onChange={(seasonId) => setField("season_id", seasonId)}
            />
            <FormField label="Fabric" value={form.fabric} onChange={(value) => setField("fabric", value)} />
            <ThemeColorsField value={form.country_colors} onChange={(value) => setField("country_colors", value)} />
            <div className="grid gap-2 md:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Sizes</p>
              <div className="flex flex-wrap gap-2">
                {sizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add sizes under Settings before saving products.</p>
                ) : sortByOrder(sizes).map((size) => (
                  <label key={size.id} className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={form.size_ids.includes(size.id)}
                      onChange={() => toggleSize(size.id)}
                      className="size-4"
                    />
                    {size.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Status
              <select
                value={form.status}
                onChange={(event) => setField("status", event.target.value as ProductStatus)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="flex h-11 self-end items-center gap-3 rounded-lg border border-border px-3 text-sm">
              <input
                checked={form.featured}
                onChange={(event) => setField("featured", event.target.checked)}
                type="checkbox"
                className="size-4"
              />
              Featured product
            </label>
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                rows={3}
                className="resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {kitOptions.map((kit) => {
              const variant = form.variants[kit.id];
              return (
                <section key={kit.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">{kit.label}</h3>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={variant.available}
                        onChange={(event) => setVariant(kit.id, { available: event.target.checked })}
                      />
                      Available
                    </label>
                  </div>
                  <div className="mt-4 space-y-3">
                    <FormField label="Variant name" value={variant.name} onChange={(value) => setVariant(kit.id, { name: value })} />
                    <FormField label="SKU" value={variant.sku} onChange={(value) => setVariant(kit.id, { sku: value })} />
                    <FormField label="Price" value={variant.price} type="number" onChange={(value) => setVariant(kit.id, { price: value })} />
                    <FormField label="Front image path" value={variant.image_front_path} onChange={(value) => setVariant(kit.id, { image_front_path: value })} />
                    <ImageUploadField
                      label={uploadingField === `${kit.id}-front` ? "Uploading front..." : "Upload front image"}
                      onChange={(file) => uploadVariantImage(kit.id, "front", file)}
                    />
                    <FormField label="Back image path" value={variant.image_back_path} onChange={(value) => setVariant(kit.id, { image_back_path: value })} />
                    <ImageUploadField
                      label={uploadingField === `${kit.id}-back` ? "Uploading back..." : "Upload back image"}
                      onChange={(file) => uploadVariantImage(kit.id, "back", file)}
                    />
                    <FormField label="Arm image path" value={variant.image_arm_path} onChange={(value) => setVariant(kit.id, { image_arm_path: value })} />
                    <ImageUploadField
                      label={uploadingField === `${kit.id}-arm` ? "Uploading arm..." : "Upload arm image"}
                      onChange={(file) => uploadVariantImage(kit.id, "arm", file)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["Front", variant.image_front_path],
                        ["Back", variant.image_back_path],
                        ["Arm", variant.image_arm_path],
                      ] as const).map(([label, path]) => (
                        <div key={label}>
                          <p className="mb-1 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
                          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30">
                            {path ? (
                              <Image src={getPublicProductImage(path)} alt={`${kit.label} ${label}`} fill sizes="96px" className="object-contain p-1" />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground">No image</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <h3 className="font-bold">Inventory by size and kit</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the exact quantity available for each size. Disabled kits are saved with zero stock.
              </p>
            </div>
            {selectedSizes.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Select at least one size above to manage inventory.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-4 py-3">Size</th>
                      {kitOptions.map((kit) => (
                        <th key={kit.id} className="px-3 py-3">
                          {kit.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSizes.map((size) => {
                      const rowTotal = kitOptions.reduce(
                        (total, kit) => total + (form.variants[kit.id].available
                          ? toNumber(form.variants[kit.id].stockBySize[size.label])
                          : 0),
                        0,
                      );

                      return (
                        <tr key={size.id} className="border-b border-border last:border-0">
                          <th className="px-4 py-3 text-sm font-bold">{size.label}</th>
                          {kitOptions.map((kit) => {
                            const variant = form.variants[kit.id];
                            return (
                              <td key={kit.id} className="px-3 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  inputMode="numeric"
                                  value={variant.available ? (variant.stockBySize[size.label] ?? "0") : "0"}
                                  onChange={(event) => setVariantStock(kit.id, size.label, event.target.value)}
                                  disabled={!variant.available}
                                  aria-label={`${size.label} ${kit.label} stock`}
                                  className="h-10 w-full min-w-20 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                                />
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-sm font-bold">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/20 text-sm font-bold">
                      <th className="px-4 py-3">Kit total</th>
                      {kitOptions.map((kit) => {
                        const variant = form.variants[kit.id];
                        const total = variant.available
                          ? selectedSizes.reduce(
                            (sum, size) => sum + toNumber(variant.stockBySize[size.label]),
                            0,
                          )
                          : 0;
                        return <td key={kit.id} className="px-3 py-3">{total}</td>;
                      })}
                      <td className="px-4 py-3 text-right">
                        {selectedSizes.reduce((total, size) => total + kitOptions.reduce(
                          (rowTotal, kit) => rowTotal + (form.variants[kit.id].available
                            ? toNumber(form.variants[kit.id].stockBySize[size.label])
                            : 0),
                          0,
                        ), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(form)} className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  onChange,
}: {
  label: string;
  onChange: (file: File) => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/50">
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function SearchSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string; searchText?: string }[];
  onChange: (value: string) => void;
}) {
  const reactId = useId();
  const datalistId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${reactId}`;
  const selected = options.find((option) => option.id === value);

  return (
    <label className="grid min-w-0 gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <input
        key={`${value}-${options.length}`}
        defaultValue={selected?.label ?? ""}
        list={datalistId}
        onChange={(event) => {
          const nextValue = event.target.value;
          const nextOption = options.find((option) => option.label === nextValue || option.searchText === nextValue);
          onChange(nextOption?.id ?? "");
        }}
        onBlur={(event) => {
          const current = options.find((option) => option.id === value);
          event.currentTarget.value = current?.label ?? "";
        }}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option.id} value={option.label} />
        ))}
      </datalist>
    </label>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function ThemeColorsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const colors = getThemeColors(value);
  const labels = ["Primary", "Secondary", "Tertiary"];

  const setColor = (index: number, color: string) => {
    const nextColors = [...colors];
    nextColors[index] = color;
    onChange(nextColors.join(", "));
  };

  return (
    <fieldset className="grid gap-2">
      <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Theme colors
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color, index) => (
          <label
            key={labels[index]}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground focus-within:border-primary"
          >
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(index, event.target.value)}
              aria-label={`${labels[index]} theme color`}
              className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="truncate">{labels[index]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PaymentSettingsCard({
  productCount,
  orderCount,
  pendingPayments,
}: {
  productCount: number;
  orderCount: number;
  pendingPayments: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Payment settings</p>
      <h2 className="mt-1 text-lg font-bold">Dubai first, wallets optional</h2>
      <div className="mt-5 space-y-3">
        <SettingRow icon={Truck} label="Primary payment" value="Cash on delivery" />
        <SettingRow icon={Banknote} label="Myanmar wallets" value="KBZPay / WavePay" />
        <SettingRow icon={CircleDollarSign} label="Base currency" value="AED" />
        <SettingRow icon={Shirt} label="Products" value={productCount.toString()} />
        <SettingRow icon={ReceiptText} label="Orders" value={orderCount.toString()} />
        <SettingRow icon={Clock3} label="Pending proofs" value={pendingPayments.toString()} />
      </div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground">
          <Icon size={16} />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <strong className="text-right text-sm">{value}</strong>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="p-5 text-sm text-muted-foreground">{label}</div>;
}
