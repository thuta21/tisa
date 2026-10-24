import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { AuthProvider } from "@/lib/AuthContext";
import { getNonce } from "@/lib/security/nonce";
import { serializeJsonLd } from "@/lib/seo";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import { getAnalyticsConfig } from "@/lib/analytics-config";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "TISA | Football Jerseys & Kits in UAE",
  applicationName: "TISA",
  openGraph: { title: "TISA Football Jersey Collection", description: "Shop football jerseys by team, league, kit and sleeve style. Choose your size and order directly with TISA on WhatsApp.", type: "website", siteName: "TISA", locale: "en_AE", images: [{ url: "/share-image", width: 1200, height: 630, alt: "TISA football jersey collection" }] },
  twitter: { card: "summary_large_image", title: "TISA Football Jerseys", description: "Find your team's jersey and order with TISA on WhatsApp.", images: ["/share-image"] },
  description: "Shop TISA football jerseys in UAE. Browse club and national team kits, compare sleeve styles, choose your size and order on WhatsApp.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = getSiteUrl();
  const nonce = await getNonce();
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {site && <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({
          "@context": "https://schema.org", "@graph": [
            { "@type": "Organization", "@id": `${site}#organization`, name: "TISA", url: site.href, logo: new URL("/assets/tisa-logo.png", site).href },
            { "@type": "WebSite", "@id": `${site}#website`, name: "TISA", url: site.href, publisher: { "@id": `${site}#organization` } },
          ],
        }) }} />}
        <AnalyticsProvider config={getAnalyticsConfig(process.env)} nonce={nonce}><AuthProvider>{children}</AuthProvider></AnalyticsProvider>
      </body>
    </html>
  );
}
