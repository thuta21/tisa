import { redirect } from "next/navigation";
import { adminClient } from "@/lib/inventory/server";
import AdminNavigation from "@/components/admin/AdminNavigation";
import WhatsAppSettings from "@/components/admin/WhatsAppSettings";
import type { WhatsAppContact } from "@/lib/whatsapp";

export const metadata = { title: "WhatsApp Numbers | TISA Admin", robots: { index: false, follow: false } };
export default async function Page() {
  let db;
  try { db = await adminClient(); }
  catch (error) {
    if ((error as Error).message === "Authentication required") redirect("/admin/login?next=/admin/settings/whatsapp");
    if ((error as Error).message === "Admin access required") return <main className="p-8">Admin access required.</main>;
    throw error;
  }
  const { data, error } = await db.from("whatsapp_contacts").select("id,label,phone,is_available,sort_order").order("sort_order").order("created_at").order("id");
  return <div data-admin-page className="min-h-screen bg-[#f7f7f5]">
    <AdminNavigation />
    <main className="px-4 pb-28 pt-6 md:ml-72 md:px-8">
      <WhatsAppSettings initialContacts={(data ?? []) as WhatsAppContact[]} initialError={error ? "WhatsApp settings could not be loaded. Apply the customer WhatsApp ordering migration and reload this page." : ""} />
    </main>
  </div>;
}
