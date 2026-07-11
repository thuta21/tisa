import { Suspense } from "react";
import Login from "@/app/pages/Login";

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-background" />}><Login /></Suspense>;
}
