import type { Metadata } from "next"
import HomeClient from "@/components/HomeClient"
import { getPublicListings } from "@/lib/public-listings"
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Used Cars Ireland | Cars for Sale Ireland",
  description:
    "Search used cars for sale in Ireland on AutoDeal.ie. Find Volkswagen Passat, Audi, BMW, Toyota, Ford, vans and more vehicles from Irish sellers.",
  alternates: {
    canonical: "/",
  },
}

export default async function Home() {
  const initialListings = await getPublicListings().catch(() => [])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([websiteJsonLd(), organizationJsonLd()]) }}
      />
      <HomeClient initialListings={initialListings} hasInitialListings />
    </>
  )
}
