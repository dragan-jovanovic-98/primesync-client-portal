import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

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
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
