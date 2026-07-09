import { Suspense } from "react";
import Pricelists from "@/app/pages/Pricelists";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Pricelists />
    </Suspense>
  );
}
