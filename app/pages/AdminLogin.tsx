"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getAdminNextPath() {
  if (typeof window === "undefined") return "/admin";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        router.replace(getAdminNextPath());
        return;
      }

      setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      setError("Invalid admin login.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Admin profile table is not ready yet. Push the Supabase schema first.");
      return;
    }

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account does not have admin access.");
      return;
    }

    router.replace(getAdminNextPath());
  };

  return (
    <main data-admin-page className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5 py-8 text-foreground sm:px-8">
      <section className="flex w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-background p-7 shadow-sm sm:p-10 lg:p-12">
          <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={13} /> Storefront
          </Link>

          <div className="mt-10 flex items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Admin access</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">Login</h1>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck size={24} />
            </div>
          </div>

          {checking ? (
            <div className="mt-10 rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              Checking current session...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Email
                <span className="relative">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    required
                    className="h-14 w-full rounded-lg border border-border bg-background pl-12 pr-4 text-base font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
                    placeholder="admin@tisa.com"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Password
                <span className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="h-14 w-full rounded-lg border border-border bg-background pl-12 pr-12 text-base font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-full bg-primary px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
