import type { Metadata } from "next";
import Home from "@/app/pages/Home";
import { getPreviewCatalog, getPreviewNavigation } from "@/lib/catalog-server";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Page() {
  const [jerseys, navigation] = await Promise.all([getPreviewCatalog(), getPreviewNavigation()]);
  return <Home jerseys={jerseys} {...navigation} />;
}
