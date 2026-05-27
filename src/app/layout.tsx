import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: "/favicon.svg",
  },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: false, follow: false },
  other: {
    "theme-color": "#1a1625",
  },
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Studio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE.description,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/PreOrder",
    description: "Early access — join the waitlist",
  },
  creator: {
    "@type": "Organization",
    name: "Faraday Capital Systems",
    url: "https://faradaycapitalsystems.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-white text-text font-sans antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdOrganization),
          }}
        />
        {children}
      </body>
    </html>
  );
}
