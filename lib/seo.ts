import type { Metadata } from "next"

export const siteUrl = "https://autodeal.ie"
export const siteName = "AutoDeal.ie"

type ListingLike = Record<string, unknown>

export function absoluteUrl(path = "/") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`
}

export function listingUrl(id: string | number) {
  return absoluteUrl(`/cars/${id}`)
}

export function text(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function listingName(listing: ListingLike) {
  return (
    text(listing.title) ||
    [listing.year, listing.brand || listing.make, listing.model]
      .map(text)
      .filter(Boolean)
      .join(" ") ||
    "Used car for sale"
  ).slice(0, 90)
}

export function listingMetaTitle(listing: ListingLike) {
  const name = listingName(listing)
  const location = text(listing.location) || "Ireland"
  const price = formatPrice(listing.price)

  return [name, price, location, "Used Cars Ireland"]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 120)
}

export function listingMetaDescription(listing: ListingLike) {
  const name = listingName(listing)
  const parts = [
    name,
    formatPrice(listing.price),
    text(listing.year),
    text(listing.mileage) ? `${Number(listing.mileage).toLocaleString("en-IE")} km` : "",
    text(listing.fuel),
    text(listing.transmission),
    text(listing.location) || "Ireland",
  ].filter(Boolean)

  return `${parts.join(" · ")}. View this used car for sale on AutoDeal.ie, Ireland's car marketplace.`
    .slice(0, 165)
}

export function listingImages(listing: ListingLike) {
  const images = Array.isArray(listing.images)
    ? listing.images.map(text).filter(Boolean)
    : []
  const featured = text(listing.featured_image_url)

  return Array.from(new Set([featured, ...images].filter(Boolean)))
}

export function listingMetadata(listing: ListingLike, id: string | number): Metadata {
  const url = listingUrl(id)
  const images = listingImages(listing)
  const title = listingMetaTitle(listing)
  const description = listingMetaDescription(listing)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      siteName,
      url,
      title,
      description,
      images: images.slice(0, 4).map((image) => ({ url: image })),
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title,
      description,
      images: images.slice(0, 1),
    },
  }
}

export function vehicleJsonLd(listing: ListingLike, id: string | number) {
  const url = listingUrl(id)
  const images = listingImages(listing)
  const brand = text(listing.brand || listing.make)
  const model = text(listing.model)
  const price = Number(listing.price || 0)

  return removeEmpty({
    "@context": "https://schema.org",
    "@type": "Car",
    name: listingName(listing),
    url,
    image: images,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    model,
    vehicleModelDate: text(listing.year),
    mileageFromOdometer: listing.mileage
      ? {
          "@type": "QuantitativeValue",
          value: Number(listing.mileage),
          unitCode: "KMT",
        }
      : undefined,
    fuelType: text(listing.fuel),
    vehicleTransmission: text(listing.transmission),
    bodyType: text(listing.body_type),
    color: text(listing.color),
    vehicleEngine: text(listing.engine_size)
      ? {
          "@type": "EngineSpecification",
          engineDisplacement: text(listing.engine_size),
        }
      : undefined,
    offers: price
      ? {
          "@type": "Offer",
          url,
          price,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          areaServed: text(listing.location) || "Ireland",
        }
      : undefined,
  })
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "AutoDeal",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/listings?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: absoluteUrl("/android-chrome-512x512.png"),
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@autodeal.ie",
      contactType: "customer support",
      areaServed: "IE",
    },
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

function formatPrice(value: unknown) {
  const price = Number(value || 0)
  return price ? `€${price.toLocaleString("en-IE")}` : ""
}

function removeEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(removeEmpty).filter((item) => item !== undefined && item !== "") as T
  }

  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, removeEmpty(item)])
      .filter(([, item]) => {
        if (item === undefined || item === null || item === "") return false
        if (Array.isArray(item) && item.length === 0) return false
        return true
      })
  ) as T
}
