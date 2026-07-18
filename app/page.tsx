import HomeClient from "@/components/HomeClient"
import { getPublicListings } from "@/lib/public-listings"

export const revalidate = 60

export default async function Home() {
  const initialListings = await getPublicListings().catch(() => [])

  return <HomeClient initialListings={initialListings} hasInitialListings />
}
