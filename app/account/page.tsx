import type { Metadata } from "next";
import CustomerAccount from "@/app/pages/CustomerAccount";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "My Account | TISA", robots: { index: false, follow: false } };
export default async function Page() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?next=/account");
  return <CustomerAccount />;
}
