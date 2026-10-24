import type { Metadata } from "next";
import { Suspense } from "react";
import Register from "@/app/pages/Register";

export const metadata: Metadata = { title: "Create Account | TISA", robots: { index: false, follow: false } };
export default function Page() { return <Suspense fallback={<p className="p-8">Loading registration…</p>}><Register /></Suspense>; }
