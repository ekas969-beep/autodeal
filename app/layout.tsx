import "./globals.css"
import type { Metadata } from "next"
import Navbar from "@/components/Navbar"
import SiteFooter from "@/components/SiteFooter"
import ClientErrorReporter from "@/components/ClientErrorReporter"

export const metadata: Metadata = {
  title: {
    default: "AutoDeal.ie",
    template: "%s | AutoDeal.ie",
  },
  description: "Buy and sell vehicles in Ireland.",
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
