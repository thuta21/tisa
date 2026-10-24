import { redirect } from "next/navigation";
import { adminClient } from "@/lib/inventory/server";
import AdminNavigation from "@/components/admin/AdminNavigation";
import MarketingWorkspace from "@/components/admin/marketing/MarketingWorkspace";
export const metadata = {
  title: "Marketing Studio | TISA Admin",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: PageProps<"/admin/marketing">) {
  try {
    await adminClient();
  } catch (error) {
    if ((error as Error).message === "Authentication required")
      redirect("/admin/login");
    if ((error as Error).message === "Admin access required")
      return (
        <main className="p-8">
          <h1>Admin role required</h1>
        </main>
      );
    throw error;
  }
  const query = await searchParams;
  return (
    <div data-admin-page className="min-h-screen bg-[#f7f7f5]">
      <AdminNavigation />
      <main className="px-4 pb-28 pt-6 md:ml-72 md:px-8">
        <MarketingWorkspace
          initialProduct={
            typeof query.product === "string" ? query.product : undefined
          }
        />
      </main>
    </div>
  );
}
