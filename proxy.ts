import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { getSafeAdminRedirectPath } from "@/lib/auth/redirect";

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  const loginUrl = new URL("/admin/login", request.url);

  if (url.pathname !== "/admin/login") {
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  // Public routes still pass through Proxy so Supabase can refresh auth cookies.
  // Authorization redirects apply only to the admin route group.
  if (!isAdminPath) return response;

  if (claimsError || !claimsData?.claims?.sub) {
    return isLoginPage ? response : redirectToLogin(request);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claimsData.claims.sub)
    .maybeSingle();

  const isAdmin = !profileError && profile?.role === "admin";

  if (!isAdmin) {
    return isLoginPage ? response : redirectToLogin(request);
  }

  if (isLoginPage) {
    const safeNextPath = getSafeAdminRedirectPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(safeNextPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
