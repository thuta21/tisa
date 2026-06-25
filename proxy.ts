import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (userError || !userData.user) {
    return isLoginPage ? response : redirectToLogin(request);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const isAdmin = !profileError && profile?.role === "admin";

  if (!isAdmin) {
    return isLoginPage ? response : redirectToLogin(request);
  }

  if (isLoginPage) {
    const nextPath = request.nextUrl.searchParams.get("next");
    const safeNextPath = nextPath?.startsWith("/admin") && !nextPath.startsWith("//") ? nextPath : "/admin";
    return NextResponse.redirect(new URL(safeNextPath, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
