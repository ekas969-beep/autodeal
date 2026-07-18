import ListingsClient from "@/components/ListingsClient"
import { getPublicListings } from "@/lib/public-listings"

export const revalidate = 60

export default async function ListingsPage() {
  const initialListings = await getPublicListings().catch(() => [])

  return <ListingsClient initialListings={initialListings} hasInitialListings />
}
