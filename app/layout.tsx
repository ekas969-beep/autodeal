import "./globals.css"
import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import SiteFooter from "@/components/SiteFooter"
import ClientErrorReporter from "@/components/ClientErrorReporter"
import { siteName, siteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Used Cars Ireland | Cars for Sale Ireland | AutoDeal.ie",
    template: `%s | ${siteName}`,
  },
  description:
    "Find used cars for sale in Ireland on AutoDeal.ie. Browse Volkswagen Passat, Audi, BMW, Toyota, Ford and more cars from sellers across Ireland.",
  applicationName: siteName,
  keywords: [
    "used cars Ireland",
    "cars for sale Ireland",
    "car marketplace Ireland",
    "buy cars Ireland",
    "sell car Ireland",
    "Volkswagen Passat Ireland",
    "VW Passat for sale",
    "Audi for sale Ireland",
    "BMW for sale Ireland",
    "Toyota for sale Ireland",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IE",
    siteName,
    url: siteUrl,
    title: "Used Cars Ireland | Cars for Sale Ireland | AutoDeal.ie",
    description:
      "Browse used cars for sale across Ireland on AutoDeal.ie. Find Volkswagen, Audi, BMW, Toyota, Ford and more vehicles.",
  },
  twitter: {
    card: "summary",
    title: "Used Cars Ireland | Cars for Sale Ireland | AutoDeal.ie",
    description:
      "Browse used cars for sale across Ireland on AutoDeal.ie.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ClientErrorReporter />
        <Navbar />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
