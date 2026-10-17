import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "TISA",
  openGraph: { title: "TISA Football Jersey Collection", description: "Explore teams, kit designs and sleeve styles. TISA collection preview; online ordering is not open yet.", type: "website", siteName: "TISA", images: [{ url: "/share-image", width: 1200, height: 630, alt: "TISA football jersey collection preview" }] },
  twitter: { card: "summary_large_image", images: ["/share-image"] },
  description: "TISA football jersey collection preview. Online ordering is not open yet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
