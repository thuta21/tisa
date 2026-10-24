"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateCustomerProfile } from "@/lib/customer-profile";

export default function CustomerProfileForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createSupabaseBrowserClient().from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      setName(data?.display_name ?? user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "");
      setPhone(data?.phone ?? user.user_metadata?.phone ?? "");
      if (error) setError("Unable to load your profile. Please try again.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSaved(false);
    const invalid = validateCustomerProfile(name, phone);
    if (invalid) { setError(invalid); return; }
    setSaving(true);
    try {
      const { error } = await createSupabaseBrowserClient().rpc("update_customer_profile", { p_display_name: name, p_phone: phone });
      if (error) throw error;
      setSaved(true);
    } catch { setError("Unable to save your profile. Please try again."); }
    finally { setSaving(false); }
  }
  return <section className="mt-8 rounded-2xl border border-border p-5 sm:p-7">
    <h2 className="text-xl font-bold">Contact details</h2>
    <p className="mt-2 text-sm text-muted-foreground">These details are included when you order through WhatsApp.</p>
    {loading ? <p className="mt-4 text-sm">Loading profile…</p> : <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="profile-name" className="text-sm font-medium">Full name</label><input id="profile-name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3" /></div>
      <div><label htmlFor="profile-phone" className="text-sm font-medium">Phone number</label><input id="profile-phone" type="tel" autoComplete="tel" required maxLength={25} placeholder="+971 50 123 4567" value={phone} onChange={e => { setPhone(e.target.value); setSaved(false); }} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3" /></div>
      <button disabled={saving} className="min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-white disabled:opacity-40 sm:justify-self-start">{saving ? "Saving…" : "Save contact details"}</button>
      {saved && <p role="status" className="self-center text-sm text-primary">Your contact details are saved.</p>}
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
  </section>;
}
