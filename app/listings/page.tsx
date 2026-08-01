import type { Metadata } from "next"
import ListingsClient from "@/components/ListingsClient"
import { getPublicListings } from "@/lib/public-listings"
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Cars for Sale Ireland | Used Cars, Vans and Vehicles",
  description:
    "Browse cars for sale in Ireland on AutoDeal.ie. Search used cars by make, model, price, year, mileage, fuel type and location.",
  alternates: {
    canonical: "/listings",
  },
  openGraph: {
    title: "Cars for Sale Ireland | Used Cars, Vans and Vehicles",
    description:
      "Search used cars for sale across Ireland on AutoDeal.ie by make, model, price and location.",
    url: "/listings",
  },
}

export default async function ListingsPage() {
  const initialListings = await getPublicListings().catch(() => [])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: absoluteUrl("/") },
              { name: "Cars for Sale Ireland", url: absoluteUrl("/listings") },
            ])
          ),
        }}
      />
      <ListingsClient initialListings={initialListings} hasInitialListings />
    </>
  )
}
