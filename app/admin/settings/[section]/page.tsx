import { notFound } from "next/navigation";
import AdminDashboard from "@/app/pages/AdminDashboard";

const sections = new Set([
  "leagues",
  "sizes",
  "teams",
  "seasons",
  "charges",
  "payment_methods",
  "fonts",
]);

export default async function AdminSettingsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <AdminDashboard />;
}
