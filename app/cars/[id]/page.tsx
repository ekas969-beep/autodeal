import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import CarGallery from "@/components/CarGallery"
import BackButton from "@/components/BackButton"
import ScrollToTop from "@/components/ScrollToTop"
import FavoriteButton from "@/components/FavoriteButton"
import ListingCardMeta from "@/components/ListingCardMeta"
import type { ListingCardMetaIcon } from "@/components/ListingCardMeta"
import SellerContactReveal from "@/components/SellerContactReveal"
import ListingShareButton from "@/components/ListingShareButton"
import BuyerTips from "@/components/BuyerTips"
import { isListingCurrentlyPublic } from "@/lib/listing-expiry"

export default async function CarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !listing || !isPublicListing(listing)) {
    return notFound()
  }

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.featured_image_url
        ? [listing.featured_image_url]
        : []

  const details = [
    { label: "Make", value: listing.brand || listing.make },
    { label: "Model", value: listing.model },
    { label: "Year", value: listing.year },
    {
      label: "Mileage",
      value: listing.mileage
        ? `${Number(listing.mileage).toLocaleString("en-IE")} km`
        : null,
    },
    { label: "Fuel", value: listing.fuel },
    { label: "Transmission", value: listing.transmission },
    { label: "Location", value: listing.location },
    { label: "Body type", value: listing.body_type },
    { label: "Colour", value: listing.color },
    { label: "Doors", value: listing.doors },
    { label: "Seats", value: listing.seats },
    { label: "Registration", value: listing.registration_country },
    { label: "Engine size", value: listing.engine_size },
    { label: "Engine power", value: listing.engine_power },
    { label: "Previous owners", value: listing.previous_owners },
    {
      label: "NCT expiry",
      value: listing.nct_expiry ? formatDate(listing.nct_expiry) : null,
    },
    {
      label: "Tax expiry",
      value: listing.tax_expiry ? formatDate(listing.tax_expiry) : null,
    },
    {
      label: "Annual tax",
      value: listing.annual_tax ? `€${listing.annual_tax}` : null,
    },
  ].filter((item) => item.value)
  const vehicleName = [listing.brand || listing.make, listing.model].filter(Boolean).join(" ") || listing.title
  const initialContact = {
    sellerId: String(listing.user_id || ""),
    sellerName: "Seller",
    sellerType: String(listing.seller_type || "Seller"),
    avatarUrl: null,
    aboutMe: "",
    phone: String(listing.phone || listing.contact_phone || "").trim(),
    email: chooseSellerEmail(listing.contact_email, listing.email),
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white px-3 py-4 text-slate-950 sm:px-4 sm:py-6">
      <ScrollToTop />

      <div className="mx-auto w-full max-w-[1180px]">
        <div className="mb-5 sm:mb-9">
          <BackButton />
        </div>

        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,650px)_470px] lg:justify-center xl:gap-9">
          <div className="contents lg:block lg:min-w-0 lg:space-y-5">
            <div className="order-1 min-w-0">
              <CarGallery images={images} listing={listing} />
            </div>

            <section className="hidden lg:block">
              <h2 className="text-2xl font-black tracking-tight text-[#050A35]">
                Vehicle Details
              </h2>

              <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                <Highlight
                  icon="mileage"
                  label="Mileage"
                  value={
                    listing.mileage
                      ? `${Number(listing.mileage).toLocaleString("en-IE")} km`
                      : "-"
                  }
                />
                <Highlight icon="year" label="Year" value={listing.year || "-"} />
                <Highlight icon="fuel" label="Fuel Type" value={listing.fuel || "-"} />
                <Highlight
                  icon="transmission"
                  label="Transmission"
                  value={listing.transmission || "-"}
                />
                <Highlight icon="location" label="Location" value={listing.location || "Ireland"} />
                <Highlight
                  icon="year"
                  label="NCT Expiry"
                  value={listing.nct_expiry ? formatDate(listing.nct_expiry) : "-"}
                  valueClassName={getNctValueClass(listing.nct_expiry)}
                />
              </div>
            </section>

            <section className="order-3 border-t border-slate-200 pt-7 lg:order-none">
              <h2 className="text-2xl font-black tracking-tight text-[#050A35]">
                Description
              </h2>

              <p className="mt-4 whitespace-pre-line break-words text-base leading-7 text-[#06115C]">
                {listing.description || "No description provided."}
              </p>
            </section>

            <section className="order-4 border-t border-slate-200 pt-7 lg:order-none">
              <h2 className="text-2xl font-black tracking-tight text-[#050A35]">
                More details
              </h2>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {details.map((item) => (
                  <Info key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          </div>

          <aside className="listing-sidebar order-2 min-w-0 space-y-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl bg-[#F7F7F8] px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h1 className="break-words text-2xl font-black tracking-tight text-black">
                      {vehicleName}
                    </h1>
                    {listing.year && (
                      <span className="text-xl font-black text-black">
                        {listing.year}
                      </span>
                    )}
                  </div>

                  {listing.title && listing.title !== vehicleName && (
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {listing.title}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <ListingShareButton
                    title={vehicleName}
                    className="h-11 w-11"
                  />
                  <FavoriteButton
                    listingId={String(listing.id)}
                    className="h-11 w-11 rounded-full bg-white px-0 shadow-sm"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Listed {formatListingAge(listing.created_at)}</span>
                <span className="text-slate-300">•</span>
                <span>{listing.location || "Ireland"}</span>
              </div>

              <p className="mt-4 text-3xl font-black tracking-tight text-black">
                {formatPrice(listing.price)}
              </p>

              <div className="mt-5 grid gap-x-9 gap-y-0 border-y border-slate-200 py-1 sm:grid-cols-2">
                <VehicleSummaryItem
                  icon="mileage"
                  label="Mileage"
                  value={
                    listing.mileage
                      ? `${Number(listing.mileage).toLocaleString("en-IE")} km`
                      : "-"
                  }
                />
                <VehicleSummaryItem icon="year" label="Year" value={listing.year || "-"} />
                <VehicleSummaryItem
                  icon="engine"
                  label="Engine"
                  value={formatEngineSummary(listing)}
                />
                <VehicleSummaryItem
                  icon="transmission"
                  label="Transmission"
                  value={listing.transmission || "-"}
                />
                <VehicleSummaryItem
                  icon="nct"
                  label="NCT Expiry"
                  value={listing.nct_expiry ? formatMonthYear(listing.nct_expiry) : "-"}
                  valueClassName={getNctValueClass(listing.nct_expiry)}
                />
                <VehicleSummaryItem
                  icon="owners"
                  label="Total Owners"
                  value={listing.previous_owners ?? "-"}
                />
              </div>
            </section>

            <div id="seller-contact">
              <SellerContactReveal
                listingId={String(listing.id)}
                initialContact={
                  initialContact.phone || initialContact.email ? initialContact : null
                }
              />
            </div>
          </aside>
        </div>

        <div className="mt-6 lg:mt-8">
          <BuyerTips />
        </div>
      </div>
    </main>
  )
}

function Highlight({
  icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: ListingCardMetaIcon
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-slate-500">
        <ListingCardMeta icon={icon}>{label}</ListingCardMeta>
      </p>
      <div className="min-w-0">
        <p className={`mt-0.5 break-words text-lg font-black ${valueClassName || "text-[#050A35]"}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-[#F8FAFC] px-3 py-2.5">
      <DetailIcon label={label} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-slate-950">{value || "-"}</p>
      </div>
    </div>
  )
}

function DetailIcon({ label }: { label: string }) {
  const common = "h-5 w-5 shrink-0 text-[#005BFF]"
  const normalized = label.toLowerCase()

  if (normalized.includes("make") || normalized.includes("model") || normalized.includes("body")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M4 15h16l-1.5-4.5A3 3 0 0 0 15.7 8H8.3a3 3 0 0 0-2.8 2.5L4 15ZM6.5 18.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM17.5 18.5a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (normalized.includes("year") || normalized.includes("expiry")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M7 3v3M17 3v3M4.5 9h15M6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v9.4a2.8 2.8 0 0 1-2.8 2.8H6.8A2.8 2.8 0 0 1 4 17.2V7.8A2.8 2.8 0 0 1 6.8 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (normalized.includes("mileage")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M4.2 15.8a8 8 0 1 1 15.6 0M12 12l3-3M7 15.8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (normalized.includes("fuel") || normalized.includes("engine") || normalized.includes("tax")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M6.5 20V5.8A2.3 2.3 0 0 1 8.8 3.5h5.4a2.3 2.3 0 0 1 2.3 2.3V20M5 20h13M7.6 9.5h7.8M16.5 7.2l3 3v6.1a1.7 1.7 0 0 0 3.4 0v-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (normalized.includes("transmission")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M7 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 6.5v11M17 6.5v11M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (normalized.includes("location") || normalized.includes("registration")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (normalized.includes("colour") || normalized.includes("color")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M12 21a8 8 0 1 0-8-8c0 4.4 3.6 8 8 8ZM12 5v16M4 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (normalized.includes("door")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M6 21V5.5A2.5 2.5 0 0 1 8.5 3H18v18H6ZM15 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 20a4.5 4.5 0 0 1 9 0M11.5 20a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function VehicleSummaryItem({
  icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: "mileage" | "year" | "engine" | "transmission" | "nct" | "owners"
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200 py-3">
      <div className="flex min-w-0 items-center gap-2.5 text-slate-600">
        <SummaryIcon icon={icon} />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <p className={`shrink-0 text-right text-sm font-bold ${valueClassName || "text-slate-950"}`}>
        {value}
      </p>
    </div>
  )
}

function SummaryIcon({
  icon,
}: {
  icon: "mileage" | "year" | "engine" | "transmission" | "nct" | "owners"
}) {
  const common = "h-4 w-4 shrink-0 text-slate-500"

  if (icon === "mileage") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M4.2 15.8a8 8 0 1 1 15.6 0M12 12l3-3M7 15.8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === "year" || icon === "nct") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M7 3v3M17 3v3M4.5 9h15M6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v9.4a2.8 2.8 0 0 1-2.8 2.8H6.8A2.8 2.8 0 0 1 4 17.2V7.8A2.8 2.8 0 0 1 6.8 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === "engine") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M4 13h2l2-4h5l2 4h3a2 2 0 0 1 2 2v3h-2l-1.5 2h-9L6 18H4v-5ZM9 9V6h5v3M10 6V4M13 6V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === "transmission") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <path d="M7 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 6.5v11M17 6.5v11M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 20a4.5 4.5 0 0 1 9 0M11.5 20a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatPrice(price: string | number | null | undefined) {
  return `€${Number(price || 0).toLocaleString("en-IE")}`
}

function formatDate(date: string | null | undefined) {
  if (!date) return "recently"

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function formatListingAge(date: string | null | undefined) {
  if (!date) return "recently"

  const listedAt = new Date(date).getTime()
  if (Number.isNaN(listedAt)) return "recently"

  const diffMs = Math.max(0, Date.now() - listedAt)
  const minutes = Math.floor(diffMs / (60 * 1000))

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"} ago`
}

function formatMonthYear(date: string | null | undefined) {
  if (!date) return "-"

  return new Intl.DateTimeFormat("en-IE", {
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function getNctValueClass(date: string | null | undefined) {
  if (!date) return "text-slate-950"

  const expiry = new Date(date)
  if (Number.isNaN(expiry.getTime())) return "text-slate-950"

  expiry.setHours(23, 59, 59, 999)

  return expiry >= new Date() ? "text-emerald-600" : "text-red-600"
}

function formatEngineSummary(listing: Record<string, unknown>) {
  const values = [listing.engine_size, listing.fuel]
    .map((value) => (value ? String(value) : ""))
    .filter(Boolean)

  return values.length ? values.join(" ") : "-"
}



function isPublicListing(listing: { status?: string | null }) {
  return isListingCurrentlyPublic(listing)
}

function cleanSellerEmail(value: unknown) {
  const email = String(value || "").trim()
  return email.toLowerCase() === "ekas969@gmail.com" ? "" : email
}

function chooseSellerEmail(...values: unknown[]) {
  for (const value of values) {
    const email = cleanSellerEmail(value)
    if (email) return email
  }

  return ""
}
