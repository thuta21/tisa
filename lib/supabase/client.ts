"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl, supabaseCookieOptions } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey, { cookieOptions: supabaseCookieOptions });
}

