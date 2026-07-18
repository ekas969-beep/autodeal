"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import FavoriteButton, {
  FAVORITES_EVENT,
  LOCAL_FAVORITES_KEY,
} from "@/components/FavoriteButton"

type Listing = {
  id: string
  title: string | null
  price: string | number | null
  year: string | number | null
  mileage: string | number | null
  fuel: string | null
  transmission: string | null
  location: string | null
  images: string[] | null
  featured_image_url: string | null
}

function readLocalFavoriteIds() {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(LOCAL_FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const orderedListings = useMemo(() => {
    const order = new Map(favoriteIds.map((id, index) => [id, index]))

    return [...listings].sort((a, b) => {
      return (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0)
    })
  }, [favoriteIds, listings])

  const loadFavorites = useCallback(async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setFavoriteIds([])
      setListings([])
      setLoading(false)
      router.push("/login")
      return
    }

    const { data, error } = await supabase
      .from("listing_favorites")
      .select("listing_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    const serverIds = !error
      ? (data || []).map((favorite) => String(favorite.listing_id))
      : []

    const ids = Array.from(new Set(serverIds))
    setFavoriteIds(ids)

    if (ids.length === 0) {
      setListings([])
      setLoading(false)
      return
    }

    const { data: listingsData } = await supabase
      .from("listings")
      .select("*")
      .in("id", ids)

    setListings(listingsData || [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    queueMicrotask(() => {
      loadFavorites()
    })

    const handleFavoritesChanged = () => {
      loadFavorites()
    }

    window.addEventListener(FAVORITES_EVENT, handleFavoritesChanged)

    const authListener = supabase.auth.onAuthStateChange(() => {
      loadFavorites()
    })

    return () => {
      window.removeEventListener(FAVORITES_EVENT, handleFavoritesChanged)
      authListener.data.subscription.unsubscribe()
    }
  }, [loadFavorites])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            Back
          </Link>

          <span className="text-sm text-gray-500">Favorites</span>
        </div>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">
                Saved listings
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                Your Favorites
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Keep cars you like in one clean list and come back to them later.
              </p>
            </div>

            <Link
              href="/listings"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Browse listings
            </Link>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
            Loading your favorites...
          </div>
        )}

        {!loading && orderedListings.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              No favorites saved yet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
              Tap the heart on any listing to save it here.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Find a car
            </Link>
          </div>
        )}

        {!loading && orderedListings.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orderedListings.map((car) => (
              <FavoriteListingCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function FavoriteListingCard({ car }: { car: Listing }) {
  const image =
    car.featured_image_url ||
    (Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : null)

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <Link href={`/cars/${car.id}`} className="block h-full">
          {image ? (
            <img
              src={image}
              alt={car.title || "Vehicle listing"}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </Link>

        <FavoriteButton
          listingId={String(car.id)}
          className="absolute right-3 top-3 h-11 w-11"
        />
      </div>

      <div className="p-5">
        <Link href={`/cars/${car.id}`} className="block">
          <h2 className="line-clamp-2 text-base font-bold text-gray-900 hover:text-blue-600">
            {car.title}
          </h2>
        </Link>

        <p className="mt-2 text-2xl font-extrabold text-blue-600">
          &euro;{Number(car.price || 0).toLocaleString("en-IE")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-500">
          <span>{car.year || "-"}</span>
          <span>
            {car.mileage
              ? `${Number(car.mileage).toLocaleString("en-IE")} km`
              : "-"}
          </span>
          <span>{car.fuel || "-"}</span>
          <span>{car.transmission || "-"}</span>
          <span className="col-span-2">{car.location || "Ireland"}</span>
        </div>

        <Link
          href={`/cars/${car.id}`}
          className="mt-5 flex h-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100"
        >
          View details
        </Link>
      </div>
    </article>
  )
}


