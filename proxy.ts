import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl, supabaseCookieOptions } from "@/lib/supabase/config";
import { getSafeAdminRedirectPath } from "@/lib/auth/redirect";
import { contentSecurityPolicy } from "@/lib/security/csp";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, supabaseUrl, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  // Always overwrite client-supplied nonce/CSP values.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const finalize = (target = response) => {
    if (target !== response) for (const cookie of response.cookies.getAll()) target.cookies.set(cookie);
    target.headers.set("Content-Security-Policy", csp);
    if (/^\/(admin|api|account|auth|login|register|forgot-password|reset-password)(\/|$)/.test(request.nextUrl.pathname) || response.cookies.getAll().length)
      target.headers.set("Cache-Control", "private, no-store");
    return target;
  };
  const login = () => {
    const url = new URL("/admin/login", request.url);
    if (request.nextUrl.pathname !== "/admin/login") url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return finalize(NextResponse.redirect(url));
  };
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        const previous = response.cookies.getAll();
        response = NextResponse.next({ request: { headers: requestHeaders } });
        previous.forEach(cookie => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!isAdminPath) return finalize();
    if (error || !data?.claims?.sub) return isLoginPage ? finalize() : login();
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.claims.sub).maybeSingle();
    if (profileError || profile?.role !== "admin") return isLoginPage ? finalize() : login();
    if (isLoginPage) return finalize(NextResponse.redirect(new URL(getSafeAdminRedirectPath(request.nextUrl.searchParams.get("next")), request.url)));
    return finalize();
  } catch {
    return isAdminPath && !isLoginPage ? login() : finalize();
  }
}
export const config = {
  matcher: [
    "/admin/:path*", "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
