"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
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
  Edit3,
  Eye,
  LayoutDashboard,
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
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminTab = "overview" | "orders" | "products" | "payments" | "print" | "settings";
type SettingSection = "leagues" | "sizes" | "teams" | "seasons";
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
type PaymentStatus = "pending" | "verified" | "rejected";

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

type DbOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  region: string;
  township: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
  order_items?: DbOrderItem[];
  payment_proofs?: DbPaymentProof[];
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
  quantity: string;
  unit_price: string;
};

type OrderFormState = {
  id?: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  region: string;
  township: string;
  delivery_address: string;
  delivery_fee: string;
  status: OrderStatus;
  customer_note: string;
  admin_note: string;
  payment_provider: PaymentProvider;
  payment_transaction_id: string;
  payment_amount: string;
  payment_storage_path: string;
  payment_status: PaymentStatus;
  items: OrderItemFormState[];
};

type PrintSlipSize = "a6" | "a5" | "thermal";

type DbInventory = {
  id: string;
  variant_id: string;
  size: string;
  quantity: number;
  reserved: number;
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
  accent_color: string | null;
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
  available: boolean;
  stock: string;
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
  accent_color: string;
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
const maxPaymentProofBytes = 5 * 1024 * 1024;

const orderStatusOptions: { id: OrderStatus; label: string }[] = [
  { id: "awaiting_payment", label: "Awaiting payment" },
  { id: "verification_pending", label: "Verification pending" },
  { id: "paid", label: "Paid" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "payment_rejected", label: "Payment rejected" },
];

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
];

const printSlipSizes: { id: PrintSlipSize; label: string; width: string; minHeight: string }[] = [
  { id: "a6", label: "A6 slip", width: "105mm", minHeight: "148mm" },
  { id: "a5", label: "A5 slip", width: "148mm", minHeight: "210mm" },
  { id: "thermal", label: "Thermal 80mm", width: "80mm", minHeight: "160mm" },
];

function formatAed(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMmk(amount: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} MMK`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  return orderStatusOptions.find((item) => item.id === status)?.label ?? status;
}

function getStatusClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    awaiting_payment: "border-neutral-200 bg-neutral-100 text-neutral-700",
    verification_pending: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    processing: "border-blue-200 bg-blue-50 text-blue-700",
    shipped: "border-indigo-200 bg-indigo-50 text-indigo-700",
    delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    payment_rejected: "border-red-200 bg-red-50 text-red-700",
  };
  return classes[status];
}

function getPaymentLabel(method?: PaymentProvider | "cod") {
  const labels: Record<PaymentProvider | "cod", string> = {
    cod: "COD",
    kpay: "KBZPay",
    wave: "WavePay",
  };
  return labels[method ?? "cod"];
}

function getPublicProductImage(path?: string | null) {
  if (!path) return "/assets/tisa-shirt.png";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const supabase = createSupabaseBrowserClient();
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function getProductStock(product: DbProduct) {
  const stock = { home: 0, away: 0, third: 0 } satisfies Record<KitVariant, number>;
  for (const variant of product.product_variants ?? []) {
    stock[variant.kit] = (variant.inventory ?? []).reduce((sum, row) => sum + row.quantity - row.reserved, 0);
  }
  return stock;
}

function getProductSizes(product: DbProduct) {
  const sizes = new Set<string>();
  for (const variant of product.product_variants ?? []) {
    for (const row of variant.inventory ?? []) sizes.add(row.size);
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
    quantity: "1",
    unit_price: "0",
  };
}

function createEmptyOrderForm(): OrderFormState {
  return {
    order_number: `TISA-${Date.now().toString().slice(-6)}`,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    region: "",
    township: "",
    delivery_address: "",
    delivery_fee: "0",
    status: "awaiting_payment",
    customer_note: "",
    admin_note: "",
    payment_provider: "kpay",
    payment_transaction_id: "",
    payment_amount: "0",
    payment_storage_path: "",
    payment_status: "pending",
    items: [createEmptyOrderItem()],
  };
}

function orderToForm(order: DbOrder): OrderFormState {
  const proof = order.payment_proofs?.[0];
  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email ?? "",
    region: order.region,
    township: order.township,
    delivery_address: order.delivery_address,
    delivery_fee: String(order.delivery_fee),
    status: order.status,
    customer_note: order.customer_note ?? "",
    admin_note: order.admin_note ?? "",
    payment_provider: proof?.provider ?? "kpay",
    payment_transaction_id: "transaction_id" in (proof ?? {}) ? (proof as DbPaymentProof).transaction_id : "",
    payment_amount: "amount" in (proof ?? {}) ? String((proof as DbPaymentProof).amount) : String(order.total),
    payment_storage_path: "storage_path" in (proof ?? {}) ? (proof as DbPaymentProof).storage_path : "",
    payment_status: proof?.status ?? "pending",
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
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    })),
  };
}

function getOrderSubtotal(items: OrderItemFormState[]) {
  return items.reduce((sum, item) => sum + toNumber(item.quantity, 1) * toNumber(item.unit_price), 0);
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
    accent_color: "#111111",
    country_colors: "#111111, #ffffff",
    featured: false,
    status: "active",
    size_ids: sizes.length ? sortByOrder(sizes).map((size) => size.id) : [],
    variants: {
      home: { kit: "home", name: "Home Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", available: true, stock: "0" },
      away: { kit: "away", name: "Away Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", available: false, stock: "0" },
      third: { kit: "third", name: "Third Kit", sku: "", price: "0", image_front_path: "", image_back_path: "", available: false, stock: "0" },
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
      available: variant.available,
      stock: String((variant.inventory ?? []).reduce((sum, row) => sum + row.quantity, 0)),
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
    accent_color: product.accent_color ?? "#111111",
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
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "denied">("checking");
  const [authMessage, setAuthMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<DbPaymentProof[]>([]);
  const [leagues, setLeagues] = useState<DbLeague[]>([]);
  const [teams, setTeams] = useState<DbTeam[]>([]);
  const [seasons, setSeasons] = useState<DbSeason[]>([]);
  const [sizes, setSizes] = useState<DbJerseySize[]>([]);
  const [settingSection, setSettingSection] = useState<SettingSection>("leagues");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SettingFormState | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductFormState | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderFormState | null>(null);
  const [viewingOrder, setViewingOrder] = useState<DbOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<DbOrder | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setActionMessage("");
    const supabase = createSupabaseBrowserClient();

    const [ordersResult, productsResult, paymentsResult, leaguesResult, teamsResult, seasonsResult, sizesResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*), payment_proofs(*)")
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
    ]);

    const firstError =
      ordersResult.error ??
      productsResult.error ??
      paymentsResult.error ??
      leaguesResult.error ??
      teamsResult.error ??
      seasonsResult.error ??
      sizesResult.error;
    if (firstError) {
      setActionMessage(firstError.message);
    } else {
      setOrders((ordersResult.data ?? []) as DbOrder[]);
      setProducts((productsResult.data ?? []) as DbProduct[]);
      setPaymentProofs((paymentsResult.data ?? []) as DbPaymentProof[]);
      setLeagues((leaguesResult.data ?? []) as DbLeague[]);
      setTeams((teamsResult.data ?? []) as DbTeam[]);
      setSeasons((seasonsResult.data ?? []) as DbSeason[]);
      setSizes((sizesResult.data ?? []) as DbJerseySize[]);
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

    await supabase
      .from("orders")
      .update({ status: status === "verified" ? "paid" : "payment_rejected" })
      .eq("id", proof.order_id);

    await loadAdminData();
  };

  const saveOrder = async (form: OrderFormState) => {
    setActionMessage("");
    const supabase = createSupabaseBrowserClient();
    const items = form.items.filter((item) => item.product_name.trim() && item.size.trim() && toNumber(item.quantity, 1) > 0);
    const subtotal = getOrderSubtotal(items);
    const deliveryFee = toNumber(form.delivery_fee);
    const total = subtotal + deliveryFee;

    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.region.trim() || !form.township.trim() || !form.delivery_address.trim()) {
      setActionMessage("Customer name, phone, region, township, and delivery address are required.");
      return;
    }

    if (!items.length) {
      setActionMessage("Add at least one order item.");
      return;
    }

    const orderPayload = {
      order_number: form.order_number.trim() || `TISA-${Date.now().toString().slice(-6)}`,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email.trim() || null,
      region: form.region.trim(),
      township: form.township.trim(),
      delivery_address: form.delivery_address.trim(),
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: form.status,
      customer_note: form.customer_note.trim() || null,
      admin_note: form.admin_note.trim() || null,
    };

    const orderResult = form.id
      ? await supabase.from("orders").update(orderPayload).eq("id", form.id).select("id").single()
      : await supabase.from("orders").insert(orderPayload).select("id").single();

    if (orderResult.error || !orderResult.data) {
      setActionMessage(orderResult.error?.message ?? "Failed to save order.");
      return;
    }

    const orderId = orderResult.data.id as string;
    if (form.id) {
      const { error } = await supabase.from("order_items").delete().eq("order_id", orderId);
      if (error) {
        setActionMessage(error.message);
        return;
      }
    }

    const orderItems = items.map((item) => {
      const quantity = toNumber(item.quantity, 1);
      const unitPrice = toNumber(item.unit_price);
      return {
        order_id: orderId,
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        product_name: item.product_name.trim(),
        kit_name: item.kit_name.trim() || kitOptions.find((kit) => kit.id === item.kit)?.label || "Home Kit",
        size: item.size.trim(),
        custom_name: item.custom_name.trim() || null,
        custom_number: item.custom_number.trim() || null,
        quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      };
    });

    const itemResult = await supabase.from("order_items").insert(orderItems);
    if (itemResult.error) {
      setActionMessage(itemResult.error.message);
      return;
    }

    if (form.id) await supabase.from("payment_proofs").delete().eq("order_id", orderId);
    if (form.payment_transaction_id.trim() && form.payment_storage_path.trim()) {
      const proofResult = await supabase.from("payment_proofs").insert({
        order_id: orderId,
        provider: form.payment_provider,
        transaction_id: form.payment_transaction_id.trim(),
        amount: toNumber(form.payment_amount, total),
        storage_path: form.payment_storage_path.trim(),
        status: form.payment_status,
      });
      if (proofResult.error) {
        setActionMessage(proofResult.error.message);
        return;
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

  const getActiveSettingRows = () => {
    if (settingSection === "leagues") return leagues;
    if (settingSection === "teams") return teams;
    if (settingSection === "seasons") return seasons;
    return sizes;
  };

  const saveSetting = async (section: SettingSection, form: SettingFormState) => {
    const supabase = createSupabaseBrowserClient();
    const name = section === "sizes" ? form.label.trim().toUpperCase() : form.name.trim();
    const slug = form.slug.trim() || slugify(name);

    if (!name || (section !== "sizes" && !slug)) {
      setActionMessage(`${getSettingTitle(section).slice(0, -1)} name is required.`);
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
      return;
    }

    setEditingSetting(null);
    setActionMessage(`${getSettingTitle(section).slice(0, -1)} saved.`);
    await loadAdminData();
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

  const saveProduct = async (form: ProductFormState) => {
    const supabase = createSupabaseBrowserClient();
    const slug = form.slug.trim() || slugify(form.name);
    const basePrice = toNumber(form.base_price);
    const selectedLeague = leagues.find((league) => league.id === form.league_id);
    const selectedTeam = teams.find((team) => team.id === form.team_id);
    const selectedSeason = seasons.find((season) => season.id === form.season_id);
    const selectedSizes = sortByOrder(sizes).filter((size) => form.size_ids.includes(size.id));
    const inventorySizes = selectedSizes.length ? selectedSizes.map((size) => size.label) : splitCsv(defaultSizes);

    if (!slug || !form.name.trim() || !selectedTeam || !selectedLeague || !selectedSeason) {
      setActionMessage("Product name, league, team, and season are required.");
      return;
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
      accent_color: form.accent_color.trim() || null,
      country_colors: splitCsv(form.country_colors),
      featured: form.featured,
      status: form.status,
    };

    const productResult = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("products").insert(payload).select("id").single();

    if (productResult.error || !productResult.data) {
      setActionMessage(productResult.error?.message ?? "Failed to save product.");
      return;
    }

    const productId = productResult.data.id as string;

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
        available: variant.available,
      };

      const variantResult = variant.id
        ? await supabase.from("product_variants").update(variantPayload).eq("id", variant.id).select("id").single()
        : await supabase.from("product_variants").insert(variantPayload).select("id").single();

      if (variantResult.error || !variantResult.data) {
        setActionMessage(variantResult.error?.message ?? `Failed to save ${kit.label}.`);
        return;
      }

      const variantId = variantResult.data.id as string;
      await supabase.from("inventory").delete().eq("variant_id", variantId);

      if (inventorySizes.length) {
        const quantity = toNumber(variant.stock);
        const perSizeQuantity = Math.floor(quantity / inventorySizes.length);
        const remainder = quantity % inventorySizes.length;
        const inventoryRows = inventorySizes.map((size, index) => ({
          variant_id: variantId,
          size,
          quantity: perSizeQuantity + (index < remainder ? 1 : 0),
          reserved: 0,
        }));
        const inventoryResult = await supabase.from("inventory").insert(inventoryRows);
        if (inventoryResult.error) {
          setActionMessage(inventoryResult.error.message);
          return;
        }
      }
    }

    setEditingProduct(null);
    setActionMessage("Product saved.");
    await loadAdminData();
  };

  const deleteProduct = async (product: DbProduct) => {
    if (!window.confirm(`Delete ${product.name}? This removes variants and inventory too.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      setActionMessage(error.message);
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

  const filteredOrders = orders.filter((order) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [order.order_number, order.customer_name, order.customer_phone, order.region, order.township].some((value) =>
      value.toLowerCase().includes(term),
    );
  });

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

        <nav className="grid grid-cols-6 gap-1 md:mt-8 md:grid-cols-1 md:gap-2">
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
            <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              Storefront <ArrowUpRight size={13} />
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Admin Panel</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Dubai stock, orders, products, and wallet proof review from Supabase.
            </p>
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
          <div className="mt-5 rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
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

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
                  <OrdersPanel orders={orders.slice(0, 4)} compact onStatusChange={updateOrderStatus} />
                  <PaymentsPanel proofs={paymentProofs.filter((proof) => proof.status === "pending").slice(0, 4)} onStatusChange={updatePaymentStatus} />
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
                  <button
                    type="button"
                    onClick={() => {
                      setActionMessage("");
                      setEditingOrder(createEmptyOrderForm());
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"
                  >
                    <Plus size={13} /> Add Order
                  </button>
                </div>
                <OrdersPanel
                  orders={filteredOrders}
                  onStatusChange={updateOrderStatus}
                  onView={setViewingOrder}
                  onEdit={(order) => {
                    setActionMessage("");
                    setEditingOrder(orderToForm(order));
                  }}
                  onDelete={deleteOrder}
                  onPrint={setPrintingOrder}
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
                <ProductsPanel rows={productRows} sizes={sizes} onEdit={setEditingProduct} onDelete={deleteProduct} />
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
                    Use the Settings submenu in the sidebar to switch between Leagues, Sizes, Teams, and Seasons.
                  </p>
                </section>
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
              </section>
            )}
          </>
        )}
      </main>

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
          message={actionMessage}
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
        />
      )}
      {printingOrder && (
        <PrintSlipPreview order={printingOrder} onClose={() => setPrintingOrder(null)} />
      )}
    </div>
  );
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
  onView,
  onEdit,
  onDelete,
  onPrint,
}: {
  orders: DbOrder[];
  compact?: boolean;
  onStatusChange: (order: DbOrder, status: OrderStatus) => void;
  onView?: (order: DbOrder) => void;
  onEdit?: (order: DbOrder) => void;
  onDelete?: (order: DbOrder) => void;
  onPrint?: (order: DbOrder) => void;
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
          const provider = order.payment_proofs?.[0]?.provider ?? "cod";
          const itemCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
          return (
            <article key={order.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{order.order_number}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {order.customer_name} · {order.customer_phone} · {order.township}, {order.region}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.created_at)} · {itemCount} item{itemCount === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-3 lg:justify-end">
                <span className="rounded-full bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                  {getPaymentLabel(provider)}
                </span>
                <strong className="text-lg">{formatAed(order.total)}</strong>
              </div>
              <select
                value={order.status}
                onChange={(event) => onStatusChange(order, event.target.value as OrderStatus)}
                className="h-10 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] outline-none hover:border-primary/50"
              >
                {orderStatusOptions.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
              {!compact && (
                <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
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
  onEdit,
  onDelete,
}: {
  rows: { product: DbProduct; stock: Record<KitVariant, number>; totalStock: number; sizes: string[] }[];
  sizes: DbJerseySize[];
  compact?: boolean;
  onEdit: (form: ProductFormState) => void;
  onDelete: (product: DbProduct) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Products</p>
          <h2 className="mt-1 text-lg font-bold">Jersey stock</h2>
        </div>
        {compact && <ChevronRight size={18} className="text-muted-foreground" />}
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
          <h2 className="mt-1 text-lg font-bold">Proof review</h2>
        </div>
        <BadgeCheck size={18} className="text-muted-foreground" />
      </div>
      <div className="divide-y divide-border">
        {proofs.length === 0 ? (
          <EmptyRow label="No payment proofs in Supabase yet." />
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
                <dd className="mt-1 font-bold">{formatMmk(proof.amount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{proof.transaction_id} · {formatDateTime(proof.created_at)}</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">Storage: {proof.storage_path}</p>
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
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Invoice</p>
                  <h2 className="mt-1 text-2xl font-bold">TISA</h2>
                  <p className="mt-1 text-sm text-neutral-600">Premium match jersey showroom</p>
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
                    {selectedOrder.township}, {selectedOrder.region}
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
                      <td className="py-3 font-medium">{item.product_name}</td>
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
                    {selectedOrder.township}, {selectedOrder.region}
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
  message,
  onChange,
  onClose,
  onSave,
}: {
  form: OrderFormState;
  products: DbProduct[];
  sizes: DbJerseySize[];
  message: string;
  onChange: (form: OrderFormState) => void;
  onClose: () => void;
  onSave: (form: OrderFormState) => Promise<void>;
}) {
  const [uploadingProof, setUploadingProof] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const setField = <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => onChange({ ...form, [key]: value });
  const subtotal = getOrderSubtotal(form.items);
  const total = subtotal + toNumber(form.delivery_fee);

  const setItem = (index: number, patch: Partial<OrderItemFormState>) => {
    onChange({
      ...form,
      items: form.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    });
  };

  const applyProduct = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);
    const firstVariant = product?.product_variants?.[0];
    setItem(index, {
      product_id: productId,
      variant_id: firstVariant?.id ?? "",
      kit: firstVariant?.kit ?? "home",
      product_name: product?.name ?? "",
      kit_name: firstVariant?.name ?? "Home Kit",
      unit_price: String(firstVariant?.price ?? product?.base_price ?? 0),
      size: firstVariant?.inventory?.[0]?.size ?? sortByOrder(sizes)[0]?.label ?? "",
    });
  };

  const applyVariant = (index: number, variantId: string) => {
    const product = products.find((item) => item.product_variants?.some((variant) => variant.id === variantId));
    const variant = product?.product_variants?.find((item) => item.id === variantId);
    setItem(index, {
      product_id: product?.id ?? "",
      variant_id: variantId,
      kit: variant?.kit ?? "home",
      product_name: product?.name ?? "",
      kit_name: variant?.name ?? "",
      unit_price: String(variant?.price ?? product?.base_price ?? 0),
      size: variant?.inventory?.[0]?.size ?? "",
    });
  };

  const uploadPaymentProof = async (file: File) => {
    if (!allowedProductImageTypes.has(file.type)) {
      window.alert("Only JPG, PNG, and WebP voucher images are allowed.");
      return;
    }

    if (file.size > maxPaymentProofBytes) {
      window.alert("Payment voucher must be 5 MB or smaller.");
      return;
    }

    setUploadingProof(true);
    const supabase = createSupabaseBrowserClient();
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const orderNumber = slugify(form.order_number || `order-${Date.now()}`) || "order";
    const path = `manual/${orderNumber}-${crypto.randomUUID()}.${extensionByType[file.type]}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      window.alert(error.message);
    } else {
      setField("payment_storage_path", path);
    }
    setUploadingProof(false);
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
            <div className="mb-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Order no." value={form.order_number} onChange={(value) => setField("order_number", value)} />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Status
              <select value={form.status} onChange={(event) => setField("status", event.target.value as OrderStatus)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {orderStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </label>
            <FormField label="Customer" value={form.customer_name} onChange={(value) => setField("customer_name", value)} />
            <FormField label="Phone" value={form.customer_phone} onChange={(value) => setField("customer_phone", value)} />
            <FormField label="Email" value={form.customer_email} onChange={(value) => setField("customer_email", value)} />
            <FormField label="Region" value={form.region} onChange={(value) => setField("region", value)} />
            <FormField label="Township" value={form.township} onChange={(value) => setField("township", value)} />
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
                const itemSizes = variant?.inventory?.map((row) => row.size) ?? sortByOrder(sizes).map((size) => size.label);
                return (
                  <article key={index} className="grid gap-4 rounded-lg bg-muted/30 p-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_minmax(110px,0.75fr)_minmax(96px,0.6fr)_minmax(140px,0.85fr)]">
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
                      <FormField label="Qty" value={item.quantity} type="number" onChange={(value) => setItem(index, { quantity: value })} />
                      <FormField label="Unit price" value={item.unit_price} type="number" onChange={(value) => setItem(index, { unit_price: value })} />
                    </div>
                    <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_120px] lg:grid-cols-[minmax(160px,1fr)_120px_minmax(120px,1fr)_auto]">
                      <FormField label="Custom name" value={item.custom_name} onChange={(value) => setItem(index, { custom_name: value.toUpperCase().slice(0, 12) })} />
                      <FormField label="Number" value={item.custom_number} onChange={(value) => setItem(index, { custom_number: value.replace(/\D/g, "").slice(0, 2) })} />
                      <div className="rounded-lg bg-background/70 px-3 py-2 text-right md:col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Line total</p>
                        <strong className="mt-1 block text-sm">{formatMmk(toNumber(item.quantity, 1) * toNumber(item.unit_price))}</strong>
                      </div>
                      <button type="button" onClick={() => setField("items", form.items.filter((_, itemIndex) => itemIndex !== index))} className="h-11 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-destructive/40 hover:text-destructive">
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-6 grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-4">
            <FormField label="Payment amount" value={form.payment_amount || String(total)} type="number" onChange={(value) => setField("payment_amount", value)} />
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Provider
              <select value={form.payment_provider} onChange={(event) => setField("payment_provider", event.target.value as PaymentProvider)} className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary">
                <option value="kpay">KBZPay</option>
                <option value="wave">WavePay</option>
              </select>
            </label>
            <FormField label="Transaction ID" value={form.payment_transaction_id} onChange={(value) => setField("payment_transaction_id", value)} />
            <FormField label="Voucher path or URL" value={form.payment_storage_path} onChange={(value) => setField("payment_storage_path", value)} />
            <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/50">
              {uploadingProof ? "Uploading voucher..." : "Upload voucher"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPaymentProof(file);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="rounded-lg bg-muted/40 p-4 lg:col-span-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{formatMmk(subtotal)}</strong></div>
              <div className="mt-2 flex justify-between text-sm"><span>Delivery</span><strong>{formatMmk(toNumber(form.delivery_fee))}</strong></div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg"><span>Total</span><strong>{formatMmk(total)}</strong></div>
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
}: {
  order: DbOrder;
  onClose: () => void;
  onEdit: (order: DbOrder) => void;
  onPrint: (order: DbOrder) => void;
}) {
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
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{order.delivery_address}<br />{order.township}, {order.region}</p>
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-bold">Payment</h3>
              <p className="mt-3 text-sm text-muted-foreground">Status: {getStatusLabel(order.status)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Method: {getPaymentLabel(order.payment_proofs?.[0]?.provider ?? "cod")}</p>
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
                    {(item.custom_name || item.custom_number) && <p className="mt-1 text-xs text-muted-foreground">Print: {item.custom_name || "-"} #{item.custom_number || "-"}</p>}
                  </div>
                  <strong>{formatMmk(item.line_total)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-border p-5">
          <button type="button" onClick={() => onEdit(order)} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]"><Edit3 size={13} /> Edit</button>
          <button type="button" onClick={() => onPrint(order)} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"><Printer size={13} /> Preview slip</button>
        </div>
      </div>
    </div>
  );
}

function PrintSlipPreview({ order, onClose }: { order: DbOrder; onClose: () => void }) {
  const [size, setSize] = useState<PrintSlipSize>("a6");
  const selectedSize = printSlipSizes.find((item) => item.id === size) ?? printSlipSizes[0];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-slip-document, #print-slip-document * { visibility: visible !important; }
          #print-slip-document { position: absolute !important; left: 0 !important; top: 0 !important; box-shadow: none !important; }
          @page { margin: 8mm; }
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
            Preview ကိုကြည့်ပြီးမှ print နှိပ်ပါ။ Printer dialog မှာ paper size/custom size ကိုဒီ preview size နဲ့ညှိနိုင်ပါတယ်။
          </p>
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => window.print()} className="h-11 rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">Print Slip</button>
            <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-[10px] font-bold uppercase tracking-[0.14em]">Close</button>
          </div>
        </section>

        <section className="overflow-auto rounded-xl bg-neutral-200 p-5">
          <article
            id="print-slip-document"
            className="mx-auto bg-white p-5 text-black shadow-xl"
            style={{ width: selectedSize.width, minHeight: selectedSize.minHeight }}
          >
            <div className="flex items-center gap-3 border-b border-neutral-300 pb-4">
              <Image src="/assets/tisa-logo.png" alt="TISA logo" width={42} height={42} className="rounded-md" />
              <div>
                <h1 className="text-xl font-black tracking-[0.18em]">TISA</h1>
                <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500">Payment voucher slip</p>
              </div>
            </div>
            <div className="grid gap-3 border-b border-neutral-300 py-4 text-xs">
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Order</span><strong>{order.order_number}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Date</span><strong>{formatDateTime(order.created_at)}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Customer</span><strong className="text-right">{order.customer_name}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-500">Phone</span><strong>{order.customer_phone}</strong></div>
              <p className="leading-5 text-neutral-700">{order.delivery_address}<br />{order.township}, {order.region}</p>
            </div>
            <div className="border-b border-neutral-300 py-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Items</h2>
              <div className="mt-2 space-y-2">
                {(order.order_items ?? []).map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 text-xs">
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-[10px] text-neutral-500">{item.kit_name} / {item.size} / Qty {item.quantity}</p>
                    </div>
                    <strong>{formatMmk(item.line_total)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="py-4">
              <div className="flex justify-between text-xs"><span>Subtotal</span><strong>{formatMmk(order.subtotal)}</strong></div>
              <div className="mt-1 flex justify-between text-xs"><span>Delivery</span><strong>{formatMmk(order.delivery_fee)}</strong></div>
              <div className="mt-2 flex justify-between border-t border-neutral-300 pt-2 text-base font-bold"><span>Total</span><strong>{formatMmk(order.total)}</strong></div>
            </div>
            {order.payment_proofs?.[0] && (
              <div className="border-t border-neutral-300 pt-4">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Payment voucher</h2>
                <p className="mt-1 break-all text-[10px] text-neutral-600">{order.payment_proofs[0].transaction_id}</p>
                <PaymentProofImage path={order.payment_proofs[0].storage_path} />
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

function PaymentProofImage({ path }: { path: string }) {
  const [url, setUrl] = useState(path);

  useEffect(() => {
    let mounted = true;
    async function loadProofUrl() {
      if (path.startsWith("http") || path.startsWith("/")) {
        setUrl(path);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
      if (mounted && data?.signedUrl) setUrl(data.signedUrl);
    }
    loadProofUrl();
    return () => {
      mounted = false;
    };
  }, [path]);

  return (
    <div className="relative mt-3 h-40 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100">
      <Image src={url} alt="Payment voucher" fill unoptimized className="object-contain" />
    </div>
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
  const selectedLeagueTeams = form.league_id ? teams.filter((team) => team.league_id === form.league_id) : teams;

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

  const uploadVariantImage = async (kit: KitVariant, side: "front" | "back", file: File) => {
    if (!allowedProductImageTypes.has(file.type)) {
      window.alert("Only JPG, PNG, and WebP product images are allowed.");
      return;
    }

    if (file.size > maxProductImageBytes) {
      window.alert("Product images must be 10 MB or smaller.");
      return;
    }

    setUploadingField(`${kit}-${side}`);
    const supabase = createSupabaseBrowserClient();
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[file.type];
    const productSlug = form.slug.trim() || slugify(form.name) || "product";
    const safeProductSlug = slugify(productSlug) || "product";
    const path = `${safeProductSlug}/${kit}-${side}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (!error) {
      setVariant(kit, side === "front" ? { image_front_path: path } : { image_back_path: path });
    } else {
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
            <FormField label="Accent color" value={form.accent_color} onChange={(value) => setField("accent_color", value)} />
            <FormField label="Country colors" value={form.country_colors} onChange={(value) => setField("country_colors", value)} />
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
            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm">
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
                    <FormField label="Total stock" value={variant.stock} type="number" onChange={(value) => setVariant(kit.id, { stock: value })} />
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
                  </div>
                </section>
              );
            })}
          </div>
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
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
        className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
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
