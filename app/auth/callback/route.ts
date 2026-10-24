import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl, supabaseCookieOptions } from "@/lib/supabase/config";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const nextPath = getSafeRedirectPath(requestedNext, "/account");
  const loginPath = nextPath.startsWith("/admin") ? "/admin/login" : "/login";
  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  if (!code) return NextResponse.redirect(new URL(`${loginPath}?error=missing_callback_code`, requestUrl.origin));

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const failure = NextResponse.redirect(new URL(`${loginPath}?error=callback_failed&next=${encodeURIComponent(nextPath)}`, requestUrl.origin));
    for (const cookie of response.cookies.getAll()) failure.cookies.set(cookie);
    failure.headers.set("Cache-Control", "private, no-store");
    failure.headers.set("Referrer-Policy", "no-referrer");
    return failure;
  }
  return response;
}
