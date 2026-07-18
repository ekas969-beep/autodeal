import "./globals.css"
import Navbar from "@/components/Navbar"
import SiteFooter from "@/components/SiteFooter"
import ClientErrorReporter from "@/components/ClientErrorReporter"

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


