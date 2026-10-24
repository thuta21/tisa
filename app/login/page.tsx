import type { Metadata } from "next";
import { Suspense } from "react";
import Login from "@/app/pages/Login";

export const metadata: Metadata = { title: "Customer Login | TISA", robots: { index: false, follow: false } };
export default function Page() { return <Suspense fallback={<p className="p-8">Loading login…</p>}><Login /></Suspense>; }
