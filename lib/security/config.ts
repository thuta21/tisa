export function validatePublicSupabaseConfig(rawUrl: string, rawKey: string) {
  const url = new URL(rawUrl);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)))
    throw new Error("Use an HTTPS Supabase project URL (HTTP is allowed only for a local stack).");
  const key = rawKey.trim();
  if (key.startsWith("sb_publishable_")) return;
  let role: unknown;
  try {
    const payload = key.split(".")[1];
    role = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role;
  } catch { /* Reject malformed and secret keys below. */ }
  if (role !== "anon") throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key. Never expose a secret/service-role key.");
}
