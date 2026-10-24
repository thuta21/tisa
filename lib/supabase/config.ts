import { validatePublicSupabaseConfig } from "@/lib/security/config";

function requirePublicEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabaseUrl = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const supabasePublishableKey = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
const googleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
validatePublicSupabaseConfig(supabaseUrl, supabasePublishableKey);
const supabaseCookieOptions = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

export { googleAuthEnabled, supabasePublishableKey, supabaseUrl, supabaseCookieOptions };
