"use client";
import { useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeWhatsAppNumber, type WhatsAppContact } from "@/lib/whatsapp";

const empty = { label: "", phone: "", is_available: false, sort_order: 0 };
export default function WhatsAppSettings({ initialContacts, initialError }: { initialContacts: WhatsAppContact[]; initialError: string }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [form, setForm] = useState<Omit<WhatsAppContact, "id"> & { id?: string }>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  async function reload() {
    const { data, error } = await createSupabaseBrowserClient().from("whatsapp_contacts").select("id,label,phone,is_available,sort_order").order("sort_order").order("created_at").order("id");
    if (error) throw error;
    setContacts(data as WhatsAppContact[]);
  }
  async function mutate(action: () => Promise<void>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); await reload(); setNotice(message); }
    catch (caught) { const code = (caught as { code?: string }).code; setError(code === "23505" ? "That WhatsApp number is already listed." : caught instanceof Error ? caught.message : "Unable to save WhatsApp settings. Please reload and try again."); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    await mutate(async () => {
      const payload = { label: form.label.trim(), phone: normalizeWhatsAppNumber(form.phone), is_available: form.is_available, sort_order: form.sort_order };
      if (!payload.label || payload.label.length > 80 || !Number.isInteger(payload.sort_order) || payload.sort_order < 0 || payload.sort_order > 9999) throw new Error("Enter a name and a priority between 0 and 9999.");
      const table = createSupabaseBrowserClient().from("whatsapp_contacts");
      const { error } = form.id ? await table.update(payload).eq("id", form.id) : await table.insert(payload);
      if (error) throw error;
      setForm(empty);
    }, "WhatsApp number saved.");
  }
  const available = contacts.filter(contact => contact.is_available);
  return <div className="mx-auto max-w-5xl">
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Settings</p>
    <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><MessageCircle /> WhatsApp numbers</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Add your team’s international WhatsApp numbers. Order Now uses the available number with the lowest priority value. For equal priorities, the oldest number is used first. Unavailable numbers never receive new order enquiries.</p>
    <div className="mt-6 rounded-2xl border border-border bg-white p-5">
      <p className="text-sm font-medium">{available.length ? `Receiving orders: ${available[0].label} (+${available[0].phone})` : "No team member is available. Customers will see an unavailable message when they try to order."}</p>
      <p className="mt-1 text-xs text-muted-foreground">{available.length} available · {contacts.length} numbers</p>
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-5 text-sm text-primary">{notice}</p>}
    <form onSubmit={save} className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{form.id ? "Edit number" : "Add WhatsApp number"}</h2>
      <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="wa-label" className="text-sm font-medium">Team member / label</label><input id="wa-label" required maxLength={80} value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" placeholder="TISA Sales — Dubai" /></div>
        <div><label htmlFor="wa-phone" className="text-sm font-medium">WhatsApp number</label><input id="wa-phone" type="tel" required maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" placeholder="+971 50 123 4567" /><p className="mt-1 text-xs text-muted-foreground">Include country code; omit the local leading zero.</p></div>
        <div><label htmlFor="wa-priority" className="text-sm font-medium">Priority (lower is first)</label><input id="wa-priority" type="number" required min={0} max={9999} value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" /></div>
        <label className="flex min-h-12 items-center gap-3 self-center text-sm"><input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} className="size-5 accent-primary" /> Available to receive orders</label>
        <div className="flex flex-wrap gap-3 sm:col-span-2"><button className="flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white"><Plus size={16} />{busy ? "Saving…" : form.id ? "Save changes" : "Add number"}</button>{form.id && <button type="button" onClick={() => setForm(empty)} className="min-h-12 rounded-full border border-border px-5 text-sm">Cancel editing</button>}</div>
      </fieldset>
    </form>
    <section aria-label="WhatsApp team" className="mt-6 space-y-3">
      {contacts.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Add your first number above to start receiving WhatsApp orders.</p>}
      {contacts.map(contact => <article key={contact.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
        <div className="min-w-0"><h2 className="break-words font-semibold">{contact.label}</h2><p className="mt-1 text-sm text-muted-foreground">+{contact.phone} · Priority {contact.sort_order}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" role="switch" aria-checked={contact.is_available} aria-label={`${contact.label} available`} disabled={busy} onClick={() => void mutate(async () => {
            const { error } = await createSupabaseBrowserClient().from("whatsapp_contacts").update({ is_available: !contact.is_available }).eq("id", contact.id); if (error) throw error;
            if (form.id === contact.id) setForm({ ...form, is_available: !contact.is_available });
          }, `${contact.label} is now ${contact.is_available ? "unavailable" : "available"}.`)} className={`min-h-11 rounded-full border px-4 text-sm font-medium disabled:opacity-40 ${contact.is_available ? "border-green-200 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>{contact.is_available ? "● Available" : "Unavailable"}</button>
          <button type="button" disabled={busy} onClick={() => { setForm(contact); setDeleting(null); }} className="min-h-11 rounded-full border border-border px-4 text-sm">Edit</button>
          {deleting === contact.id ? <><button type="button" disabled={busy} onClick={() => void mutate(async () => {
            const { error } = await createSupabaseBrowserClient().from("whatsapp_contacts").delete().eq("id", contact.id); if (error) throw error;
            setDeleting(null); if (form.id === contact.id) setForm(empty);
          }, "WhatsApp number removed.")} className="min-h-11 px-4 text-sm font-semibold text-destructive">Confirm delete</button><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="min-h-11 px-3 text-sm">Cancel</button></> : <button type="button" disabled={busy} onClick={() => setDeleting(contact.id)} className="min-h-11 px-4 text-sm text-destructive">Delete</button>}
        </div>
      </article>)}
    </section>
  </div>;
}
