import { redirect } from "next/navigation";
import { adminContext } from "@/lib/inventory/server";
import AdminSessionBoundary from "@/components/admin/AdminSessionBoundary";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  let adminId: string;
  try { adminId = (await adminContext()).user.id; }
  catch { redirect("/admin/login"); }
  return <AdminSessionBoundary adminId={adminId}>{children}</AdminSessionBoundary>;
}
