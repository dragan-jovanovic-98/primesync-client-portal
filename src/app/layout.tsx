import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { BRAND } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: BRAND.metadataTitle,
  description: BRAND.metadataDescription,
  icons: {
    icon: [{ url: BRAND.faviconPath, type: "image/svg+xml" }],
    apple: [{ url: BRAND.appleTouchIconPath, sizes: "180x180" }],
  },
  openGraph: {
    title: BRAND.metadataTitle,
    description: BRAND.metadataDescription,
    images: [BRAND.ogImagePath],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
