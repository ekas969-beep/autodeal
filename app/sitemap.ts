import type { MetadataRoute } from "next"
import { getPublicListings } from "@/lib/public-listings"
import { absoluteUrl, listingUrl } from "@/lib/seo"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/listings"), lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: absoluteUrl("/sell"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.45 },
  ]

  const listings = await getPublicListings().catch(() => [])
  const listingPages = listings.map((listing) => ({
    url: listingUrl(listing.id),
    lastModified: listing.updated_at || listing.created_at || now,
    changeFrequency: "daily" as const,
    priority: listing.is_premium ? 0.9 : 0.8,
  }))

  return [...staticPages, ...listingPages]
}
