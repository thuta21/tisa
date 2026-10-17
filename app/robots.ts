import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/account", "/checkout", "/cart", "/login", "/register", "/forgot-password", "/reset-password"] },
    ...(site ? { sitemap: new URL("/sitemap.xml", site).href } : {}),
  };
}
