"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageOpen, UserRound } from "lucide-react";
import Navbar from "@/components/jersey/Navbar";
import Footer from "@/components/jersey/Footer";
import { useAuth } from "@/lib/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPriceAED } from "@/lib/jerseys";

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; size: string }[];
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerAccount() {
  const router = useRouter();
  const { user, isLoadingAuth } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && !user) router.replace("/login?next=/account");
  }, [isLoadingAuth, router, user]);

  useEffect(() => {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("orders")
      .select("id,order_number,status,total,created_at,order_items(id,product_name,quantity,size)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: orderError }) => {
        if (orderError) setError(orderError.message);
        setOrders((data ?? []) as CustomerOrder[]);
        setLoadingOrders(false);
      });
  }, [user]);

  if (isLoadingAuth || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-28 sm:px-6">
        <section className="border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">My account</p>
          <div className="mt-3 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={19} /></span><div><h1 className="text-2xl font-bold">Your TISA profile</h1><p className="text-sm text-muted-foreground">{user.email}</p></div></div>
        </section>

        <section className="mt-9">
          <h2 className="text-xl font-bold">Order history</h2>
          {loadingOrders ? <div className="mt-5 h-40 animate-pulse rounded-2xl bg-muted" /> : error ? <p className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : orders.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-border p-7 text-center"><PackageOpen className="mx-auto text-muted-foreground" size={26} /><h3 className="mt-3 font-semibold">No account orders yet</h3><p className="mt-1 text-sm text-muted-foreground">Orders placed while logged in will appear here.</p><Link href="/shop" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Browse jerseys</Link></div>
          ) : <div className="mt-5 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p><h3 className="mt-1 font-bold">{order.order_number}</h3></div><div className="text-right"><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{statusLabel(order.status)}</span><p className="mt-2 font-semibold">{formatPriceAED(order.total)}</p></div></div><ul className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">{order.order_items.map((item) => <li key={item.id}>{item.product_name} × {item.quantity} · Size {item.size}</li>)}</ul></article>)}</div>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
