"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AdminSessionBoundary({ adminId, children }: { adminId: string; children: React.ReactNode }) {
  const { user, isLoadingAuth } = useAuth();
  const router = useRouter();
  const matches = user?.id === adminId;
  useEffect(() => {
    if (!isLoadingAuth && !matches) { router.replace("/admin/login"); router.refresh(); }
  }, [isLoadingAuth, matches, router]);
  if (isLoadingAuth || !matches) return <main role="status" className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Checking admin session…</main>;
  return children;
}
