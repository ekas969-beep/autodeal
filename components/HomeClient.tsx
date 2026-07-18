"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import FavoriteButton from "@/components/FavoriteButton"
import ListingCardMeta from "@/components/ListingCardMeta"
import ListingStatusBadges from "@/components/ListingStatusBadges"
import { isListingCurrentlyPublic } from "@/lib/listing-expiry"
import {
  readSearchHistory,
  saveSearchHistory,
  type SearchHistoryEntry,
} from "@/lib/search-history"

const FEATURED_INITIAL_LIMIT = 5
const FEATURED_LOAD_MORE_COUNT = 5
const LATEST_INITIAL_LIMIT = 8
const LATEST_LOAD_MORE_COUNT = 4
const HOME_SCROLL_KEY = "autodeal-home-scroll-position"
const HOME_FORCE_TOP_KEY = "autodeal-home-force-top"

const priceOptions = [1000, 2000, 5000, 10000, 15000, 20000, 30000, 50000, 100000]
const yearOptions = Array.from({ length: 32 }, (_, i) => 2026 - i)
const mileageOptions = [10000, 25000, 50000, 75000, 100000, 150000, 200000, 300000]
const bodyTypes = ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible", "MPV", "Van"]
const colors = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Gold", "Other"]
const doorsOptions = ["2", "3", "4", "5"]
const seatsOptions = ["2", "4", "5", "6", "7", "8+"]
const registrationCountries = ["Ireland", "UK", "Northern Ireland", "Other"]
const sellerTypes = ["Private Seller", "Dealership"]
const fuelFallbackOptions = ["Petrol", "Diesel", "Hybrid", "Electric", "Plug-in Hybrid"]
const transmissionFallbackOptions = ["Manual", "Automatic"]
const popularMakes = ["Volkswagen", "Audi", "BMW", "Toyota", "Mercedes-Benz", "Ford", "Skoda", "Hyundai", "Nissan", "BYD"]
const popularMotorcycleMakes = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Ducati", "KTM", "Triumph"]
const popularCommercialMakes = ["Ford", "Volkswagen", "Mercedes-Benz", "Renault", "Peugeot", "Citroen", "Opel", "Toyota"]

const carMakes = [
  "Abarth", "Alfa Romeo", "Audi", "BMW", "BYD", "Citroen", "Cupra", "Dacia",
  "Fiat", "Ford", "Honda", "Hyundai", "Jaguar", "Jeep", "Kia", "Land Rover",
  "Lexus", "Mazda", "Mercedes-Benz", "MG", "Mini", "Mitsubishi", "Nissan",
  "Opel", "Peugeot", "Porsche", "Renault", "Seat", "Skoda", "Subaru", "Suzuki",
  "Tesla", "Toyota", "Volkswagen", "Volvo", "Other",
]

const motorcycleMakes = [
  "Aprilia", "BMW", "Ducati", "Harley-Davidson", "Honda", "Husqvarna",
  "Kawasaki", "KTM", "Moto Guzzi", "Piaggio", "Royal Enfield", "Suzuki",
  "Triumph", "Vespa", "Yamaha", "Other",
]

const commercialMakes = [
  "Citroen", "DAF", "Fiat", "Ford", "Iveco", "MAN", "Mercedes-Benz",
  "Nissan", "Opel", "Peugeot", "Renault", "Scania", "Toyota", "Volkswagen",
  "Volvo", "Other",
]

type BrowseTab = "brands" | "counties" | "types"
type ListingSearchParams = Record<string, string>

const browseBrands = [
  "Audi",
  "BMW",
  "Ford",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "Nissan",
  "Toyota",
  "Volkswagen",
  "Honda",
  "Renault",
  "Peugeot",
]

const browseCounties = [
  "Co. Dublin",
  "Co. Cork",
  "Co. Galway",
  "Co. Limerick",
  "Co. Waterford",
  "Co. Kildare",
  "Co. Meath",
  "Co. Wicklow",
  "Co. Louth",
  "Co. Donegal",
  "Co. Kerry",
  "Co. Mayo",
]

const browseTypes: { label: string; params: ListingSearchParams }[] = [
  { label: "Cars", params: { type: "cars" } },
  { label: "Motorcycles", params: { type: "motorcycles" } },
  { label: "Commercial", params: { type: "commercial" } },
  { label: "Electric", params: { type: "cars", fuel: "Electric" } },
  { label: "Hybrid", params: { type: "cars", fuel: "Hybrid" } },
  { label: "Automatic", params: { type: "cars", transmission: "Automatic" } },
  { label: "Under 10k", params: { type: "cars", priceTo: "10000" } },
  { label: "Diesel", params: { type: "cars", fuel: "Diesel" } },
]

type HomeClientProps = {
  initialListings?: any[]
  hasInitialListings?: boolean
}

export default function HomeClient({
  initialListings = [],
  hasInitialListings = false,
}: HomeClientProps) {
  const restoredRef = useRef(false)
  const searchPanelRef = useRef<HTMLDivElement | null>(null)

  const [allListings, setAllListings] = useState<any[]>(initialListings)
  const [listings, setListings] = useState<any[]>(initialListings)
  const [loading, setLoading] = useState(!hasInitialListings)
  const [userId, setUserId] = useState("")
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [activeType, setActiveType] = useState("cars")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [featuredLimit, setFeaturedLimit] = useState(FEATURED_INITIAL_LIMIT)
  const [latestLimit, setLatestLimit] = useState(LATEST_INITIAL_LIMIT)
  const [browseTab, setBrowseTab] = useState<BrowseTab>("brands")

  const [brand, setBrand] = useState("")
  const [model, setModel] = useState("")
  const [priceFrom, setPriceFrom] = useState("")
  const [priceTo, setPriceTo] = useState("")
  const [yearFrom, setYearFrom] = useState("")
  const [yearTo, setYearTo] = useState("")
  const [fuel, setFuel] = useState("")
  const [location, setLocation] = useState("")
  const [transmission, setTransmission] = useState("")
  const [mileageFrom, setMileageFrom] = useState("")
  const [mileageTo, setMileageTo] = useState("")
  const [bodyType, setBodyType] = useState("")
  const [color, setColor] = useState("")
  const [doors, setDoors] = useState("")
  const [seats, setSeats] = useState("")
  const [registrationCountry, setRegistrationCountry] = useState("")
  const [sellerType, setSellerType] = useState("")

  const saveHomePosition = useCallback(
    (listingId?: string) => {
      if (typeof window === "undefined") return

      let existingListingId = ""

      try {
        const existing = sessionStorage.getItem(HOME_SCROLL_KEY)
        if (existing) {
          existingListingId = JSON.parse(existing).listingId || ""
        }
      } catch {}

      sessionStorage.setItem(
        HOME_SCROLL_KEY,
        JSON.stringify({
          page: currentPage,
          scrollY: window.scrollY,
          listingId: listingId || existingListingId,
        })
      )
    },
    [currentPage]
  )

  useEffect(() => {
    loadListings({ silent: hasInitialListings })
  }, [hasInitialListings])

  useEffect(() => {
    const refreshListings = () => {
      loadListings({ silent: true })
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshListings()
      }
    }

    window.addEventListener("focus", refreshListings)
    window.addEventListener("autodeal-refresh-public-listings", refreshListings)
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.removeEventListener("focus", refreshListings)
      window.removeEventListener("autodeal-refresh-public-listings", refreshListings)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    async function loadUserSearchHistory() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const nextUserId = user?.id || ""
        setUserId(nextUserId)
        setSearchHistory(readSearchHistory(nextUserId))
      } catch {
        setUserId("")
        setSearchHistory(readSearchHistory(""))
      }
    }

    loadUserSearchHistory()
  }, [])

  useEffect(() => {
    function handleOutsideSearchClick(event: MouseEvent | TouchEvent) {
      if (!openDropdown) return

      const target = event.target as Node | null

      if (searchPanelRef.current && target && !searchPanelRef.current.contains(target)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleOutsideSearchClick)
    document.addEventListener("touchstart", handleOutsideSearchClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideSearchClick)
      document.removeEventListener("touchstart", handleOutsideSearchClick)
    }
  }, [openDropdown])

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }

    const saveScroll = () => {
      saveHomePosition()
    }

    window.addEventListener("scroll", saveScroll, { passive: true })
    window.addEventListener("pagehide", saveScroll)

    return () => {
      saveScroll()
      window.removeEventListener("scroll", saveScroll)
      window.removeEventListener("pagehide", saveScroll)
    }
  }, [saveHomePosition])

  useEffect(() => {
    resetFiltersOnly()
    applyTypeFilter(activeType)
  }, [activeType, allListings])

  async function loadListings({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) {
      setLoading(true)
    }

    await fetch("/api/listing-expiry", {
      method: "POST",
    }).catch(() => null)

    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("is_premium", { ascending: false })
        .order("priority_search", { ascending: false })
        .order("homepage_featured", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) return

      const publicListings = (data || []).filter(isPublicListing)

      setAllListings(publicListings)
      setListings(publicListings)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  function getVehicleType(car: any) {
    return String(car.vehicle_type || car.category || car.listing_type || car.type || "cars").toLowerCase()
  }

  function applyTypeFilter(type: string) {
    let results = [...allListings]

    if (type === "motorcycles") {
      results = results.filter((car) => {
        const value = getVehicleType(car)
        return value.includes("motor") || value.includes("bike")
      })
    }

    if (type === "commercial") {
      results = results.filter((car) => {
        const value = getVehicleType(car)
        return value.includes("commercial") || value.includes("van") || value.includes("truck")
      })
    }

    if (type === "cars") {
      results = results.filter((car) => {
        const value = getVehicleType(car)
        return !value.includes("motor") && !value.includes("bike") && !value.includes("commercial")
      })
    }

    setListings(results)
    setCurrentPage(1)
  }

  const typeListings = useMemo(() => {
    if (activeType === "motorcycles") {
      return allListings.filter((car) => {
        const value = getVehicleType(car)
        return value.includes("motor") || value.includes("bike")
      })
    }

    if (activeType === "commercial") {
      return allListings.filter((car) => {
        const value = getVehicleType(car)
        return value.includes("commercial") || value.includes("van") || value.includes("truck")
      })
    }

    return allListings.filter((car) => {
      const value = getVehicleType(car)
      return !value.includes("motor") && !value.includes("bike") && !value.includes("commercial")
    })
  }, [allListings, activeType])

  const brands = useMemo(
    () =>
      sortMakesForDropdown(
        uniquePreserveOrder([
          ...getBaseMakes(activeType),
          ...typeListings.map((car) => getListingMake(car)),
        ]),
        activeType
      ),
    [typeListings, activeType]
  )

  const models = useMemo(
    () =>
      unique(
        typeListings
          .filter((car) => !brand || getListingMake(car) === brand)
          .map((car) => getListingModel(car))
      ),
    [typeListings, brand]
  )

  const fuels = useMemo(() => {
    const values = unique(typeListings.map((car) => car.fuel))
    return values.length > 0 ? values : fuelFallbackOptions
  }, [typeListings])

  const transmissions = useMemo(() => {
    const values = unique(typeListings.map((car) => car.transmission))
    return values.length > 0 ? values : transmissionFallbackOptions
  }, [typeListings])

  const locations = useMemo(() => unique(typeListings.map((car) => car.location)), [typeListings])

  const featuredListings = useMemo(
    () => allListings.filter((car) => isPremiumListing(car)),
    [allListings]
  )

  const visibleFeaturedListings = useMemo(
    () => featuredListings.slice(0, featuredLimit),
    [featuredListings, featuredLimit]
  )

  const latestListings = useMemo(
    () => [...allListings].sort(sortNewestFirst),
    [allListings]
  )

  const visibleLatestListings = useMemo(
    () => latestListings.slice(0, latestLimit),
    [latestListings, latestLimit]
  )

  useEffect(() => {
    if (loading || restoredRef.current || listings.length === 0) return

    if (sessionStorage.getItem(HOME_FORCE_TOP_KEY) === "1") {
      restoredRef.current = true
      sessionStorage.removeItem(HOME_FORCE_TOP_KEY)
      sessionStorage.removeItem(HOME_SCROLL_KEY)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" })
      })
      return
    }

    const savedRaw = sessionStorage.getItem(HOME_SCROLL_KEY)

    if (!savedRaw) {
      restoredRef.current = true
      return
    }

    let savedY = 0
    let savedListingId = ""

    try {
      const saved = JSON.parse(savedRaw)
      savedY = Number(saved.scrollY) || 0
      savedListingId = String(saved.listingId || "")
    } catch {
      restoredRef.current = true
      return
    }

    restoredRef.current = true

    requestAnimationFrame(() => {
      const card = savedListingId
        ? document.querySelector(`[data-home-listing-id="${savedListingId}"]`)
        : null

      if (card) {
        card.scrollIntoView({ block: "center", behavior: "auto" })
        return
      }

      if (savedY > 0) {
        window.scrollTo({ top: savedY, behavior: "auto" })
      }
    })
  }, [loading, listings.length])

  function loadMoreFeatured() {
    setFeaturedLimit((value) => value + FEATURED_LOAD_MORE_COUNT)
  }

  function loadMoreLatest() {
    setLatestLimit((value) => value + LATEST_LOAD_MORE_COUNT)
  }

  function searchListings() {
    const params = new URLSearchParams()

    params.set("type", activeType)

    if (brand) params.set("brand", brand)
    if (model) params.set("model", model)
    if (priceFrom) params.set("priceFrom", priceFrom)
    if (priceTo) params.set("priceTo", priceTo)
    if (yearFrom) params.set("yearFrom", yearFrom)
    if (yearTo) params.set("yearTo", yearTo)
    if (fuel) params.set("fuel", fuel)
    if (location) params.set("location", location)
    if (transmission) params.set("transmission", transmission)
    if (mileageFrom) params.set("mileageFrom", mileageFrom)
    if (mileageTo) params.set("mileageTo", mileageTo)
    if (bodyType) params.set("bodyType", bodyType)
    if (color) params.set("color", color)
    if (doors) params.set("doors", doors)
    if (seats) params.set("seats", seats)
    if (registrationCountry) params.set("registrationCountry", registrationCountry)
    if (sellerType) params.set("sellerType", sellerType)

    const href = `/listings?${params.toString()}`
    const label = buildSearchHistoryLabel()

    if (userId && label) {
      setSearchHistory(saveSearchHistory(userId, { query: label, href }))
    }

    window.location.href = href
  }

  function buildSearchHistoryLabel() {
    return [
      brand,
      model,
      location,
      fuel,
      transmission,
      bodyType,
      color,
      doors ? `${doors} doors` : "",
      seats ? `${seats} seats` : "",
      registrationCountry,
      sellerType,
      mileageFrom ? `from ${Number(mileageFrom).toLocaleString("en-IE")} km` : "",
      mileageTo ? `to ${Number(mileageTo).toLocaleString("en-IE")} km` : "",
      priceFrom ? `from €${Number(priceFrom).toLocaleString("en-IE")}` : "",
      priceTo ? `to €${Number(priceTo).toLocaleString("en-IE")}` : "",
      yearFrom ? `from ${yearFrom}` : "",
      yearTo ? `to ${yearTo}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
  }

  function openHistorySearch(entry: SearchHistoryEntry) {
    window.location.href = entry.href
  }

  function resetFiltersOnly() {
    setBrand("")
    setModel("")
    setPriceFrom("")
    setPriceTo("")
    setYearFrom("")
    setYearTo("")
    setFuel("")
    setLocation("")
    setTransmission("")
    setMileageFrom("")
    setMileageTo("")
    setBodyType("")
    setColor("")
    setDoors("")
    setSeats("")
    setRegistrationCountry("")
    setSellerType("")
    setOpenDropdown(null)
    setShowMoreFilters(false)
    setCurrentPage(1)
  }

  function resetSearch() {
    restoredRef.current = true
    sessionStorage.removeItem(HOME_SCROLL_KEY)
    resetFiltersOnly()
    applyTypeFilter(activeType)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <section
        className="relative overflow-hidden bg-[#07111F]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(7,17,31,0.96) 0%, rgba(7,17,31,0.82) 38%, rgba(7,17,31,0.45) 68%, rgba(7,17,31,0.82) 100%), url("/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#F8FAFC] to-transparent" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 py-14 lg:-translate-y-9 lg:py-20">
          <div className="max-w-2xl text-white">
            <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-100 backdrop-blur">
              Ireland car marketplace
            </p>

            <h1 className="max-w-xl text-4xl font-black leading-[1.03] tracking-tight md:text-6xl">
              Find Your Next Car in Ireland
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-200">
              Buy, sell & discover vehicles for free.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/listings"
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                Browse Listings
              </Link>

              <Link
                href="/sell"
                className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Place Ad
              </Link>
            </div>

          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 pb-8 pt-5 lg:-mt-20 lg:pb-20 lg:pt-0">
        <div
          ref={searchPanelRef}
          className="mx-auto w-full max-w-[1120px] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur md:p-5"
        >
          <div className="mb-4 flex flex-wrap gap-x-7 gap-y-2 border-b border-slate-200">
            <TypeButton active={activeType === "cars"} onClick={() => setActiveType("cars")}>
              Cars
            </TypeButton>
            <TypeButton active={activeType === "motorcycles"} onClick={() => setActiveType("motorcycles")}>
              Motorcycles
            </TypeButton>
            <TypeButton active={activeType === "commercial"} onClick={() => setActiveType("commercial")}>
              Commercial
            </TypeButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <SelectBox id="brand" label="Make" value={brand} setValue={(v) => {
              setBrand(v)
              setModel("")
            }} options={brands} featuredLabel="Popular makes" featuredCount={getPopularMakes(activeType).filter((make) => brands.includes(make)).length} dividerLabel="All makes" wideDropdown openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />

            <SelectBox id="model" label="Model" value={model} setValue={setModel} options={models} disabled={!brand} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />

            <SelectBox id="priceFrom" label="Price from" value={priceFrom} setValue={setPriceFrom} options={priceOptions.map(String)} prefix={"\u20ac"} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
            <SelectBox id="priceTo" label="Price to" value={priceTo} setValue={setPriceTo} options={priceOptions.map(String)} prefix={"\u20ac"} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
            <SelectBox id="yearFrom" label="Year from" value={yearFrom} setValue={setYearFrom} options={yearOptions.map(String)} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
            <SelectBox id="yearTo" label="Year to" value={yearTo} setValue={setYearTo} options={yearOptions.map(String)} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />

            {showMoreFilters && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2 lg:col-span-6">
                <AdvancedFilterGroup title="Mileage">
                  <SelectBox id="mileageFrom" label="No min" value={mileageFrom} setValue={setMileageFrom} options={mileageOptions.map(String)} suffix=" km" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="mileageTo" label="No max" value={mileageTo} setValue={setMileageTo} options={mileageOptions.map(String)} suffix=" km" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                </AdvancedFilterGroup>

                <AdvancedFilterGroup title="Engine and spec">
                  <SelectBox id="fuel" label="Any fuel" value={fuel} setValue={setFuel} options={fuels} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="transmission" label="Any gearbox" value={transmission} setValue={setTransmission} options={transmissions} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="bodyType" label="Any body" value={bodyType} setValue={setBodyType} options={bodyTypes} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="color" label="Any colour" value={color} setValue={setColor} options={colors} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="doors" label="Any doors" value={doors} setValue={setDoors} options={doorsOptions} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="seats" label="Any seats" value={seats} setValue={setSeats} options={seatsOptions} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                </AdvancedFilterGroup>

                <AdvancedFilterGroup title="Seller and location">
                  <SelectBox id="location" label="All Ireland" value={location} setValue={setLocation} options={locations} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="registrationCountry" label="Any registered" value={registrationCountry} setValue={setRegistrationCountry} options={registrationCountries} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                  <SelectBox id="sellerType" label="Any seller" value={sellerType} setValue={setSellerType} options={sellerTypes} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
                </AdvancedFilterGroup>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpenDropdown(null)
                setShowMoreFilters((value) => !value)
              }}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-[#005BFF] transition hover:border-[#005BFF] hover:bg-blue-50 sm:col-span-2 lg:col-span-3"
            >
              {showMoreFilters ? "Hide advanced search" : "Show advanced search"}
              <svg
                viewBox="0 0 20 20"
                className={`h-4 w-4 transition ${showMoreFilters ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={searchListings}
              className="min-h-[46px] rounded-lg bg-[linear-gradient(135deg,#2563EB_0%,#4F35D8_100%)] px-5 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl sm:col-span-2 lg:col-span-3"
            >
              Search
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {searchHistory.length > 0 && (
              <>
                <span className="mr-1 text-xs font-bold text-slate-500">Recent searches:</span>
                {searchHistory.slice(0, 4).map((entry) => (
                  <button
                    key={`${entry.query}-${entry.createdAt}`}
                    type="button"
                    onClick={() => openHistorySearch(entry)}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-white hover:text-[#005BFF]"
                  >
                    {entry.query}
                  </button>
                ))}
              </>
            )}

            <button
              type="button"
              onClick={resetSearch}
              className="ml-auto rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#005BFF]/40 hover:text-[#005BFF]"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section id="featured-listings" className="mx-auto max-w-7xl px-4 pb-12 pt-14">
        <SectionHeader
          title="Featured Listings"
          subtitle={loading ? "Loading listings..." : `Check out ${featuredListings.length} highlighted cars on AutoDeal.ie`}
          actionHref="/listings"
          actionLabel="View all listings"
        />

        {!loading && featuredListings.length === 0 && (
          <EmptyState text="No featured listings found." />
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visibleFeaturedListings.map((car) => (
            <HomeListingCard
              key={car.id}
              car={car}
              compact
              onOpen={() => saveHomePosition(String(car.id))}
            />
          ))}
        </div>

        {visibleFeaturedListings.length < featuredListings.length && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={loadMoreFeatured}
              className="rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
            >
              Load More Featured
            </button>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <SectionHeader
          title="Latest Cars for Sale"
          subtitle={`Freshly listed vehicles across Ireland. Showing ${visibleLatestListings.length} of ${latestListings.length}.`}
          actionHref="/listings"
          actionLabel="Browse all"
        />

        {!loading && latestListings.length === 0 && (
          <EmptyState text="No listings found." />
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleLatestListings.map((car) => (
            <HomeListingCard
              key={car.id}
              car={car}
              onOpen={() => saveHomePosition(String(car.id))}
            />
          ))}
        </div>

        {visibleLatestListings.length < latestListings.length && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={loadMoreLatest}
              className="rounded-xl border border-slate-200 bg-white px-7 py-3 text-sm font-bold text-[#005BFF] shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF]/40 hover:shadow-lg"
            >
              Load More Listings
            </button>
          </div>
        )}
      </section>

      <BrowseVehiclesSection activeTab={browseTab} setActiveTab={setBrowseTab} />
    </main>
  )
}

function BrowseVehiclesSection({
  activeTab,
  setActiveTab,
}: {
  activeTab: BrowseTab
  setActiveTab: (tab: BrowseTab) => void
}) {
  return (
      <section className="border-t border-slate-200/70 bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] md:text-[28px]">Browse Vehicles</h2>
          <p className="mt-1.5 text-sm font-normal text-[#64748B] md:text-base">
            Find the perfect car by brand, location, or type
          </p>
        </div>

        <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <BrowseTabButton active={activeTab === "brands"} onClick={() => setActiveTab("brands")}>
              Brands
            </BrowseTabButton>
            <BrowseTabButton active={activeTab === "counties"} onClick={() => setActiveTab("counties")}>
              Counties
            </BrowseTabButton>
            <BrowseTabButton active={activeTab === "types"} onClick={() => setActiveTab("types")}>
              Types
            </BrowseTabButton>
          </div>
        </div>

        <div className="mx-auto mt-7 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeTab === "brands" &&
            browseBrands.map((item) => (
              <QuickSearchCard
                key={item}
                label={item}
                iconType="brand"
                href={buildListingsHref({ type: "cars", brand: item })}
              />
            ))}

          {activeTab === "counties" &&
            browseCounties.map((item) => (
              <QuickSearchCard
                key={item}
                label={item}
                iconType="location"
                href={buildListingsHref({ type: "cars", location: item })}
              />
            ))}

          {activeTab === "types" &&
            browseTypes.map((item) => (
              <QuickSearchCard
                key={item.label}
                label={item.label}
                iconType="type"
                href={buildListingsHref(item.params)}
              />
            ))}
        </div>
      </div>
    </section>
  )
}

function BrowseTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-24 rounded-full px-6 py-2 text-sm font-semibold transition ${
        active
          ? "bg-blue-50 text-[#005BFF] shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-[#005BFF]"
      }`}
    >
      {children}
    </button>
  )
}

function QuickSearchCard({
  label,
  href,
  iconType,
}: {
  label: string
  href: string
  iconType: "brand" | "location" | "type"
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF]/35 hover:shadow-md hover:shadow-blue-500/10"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 transition group-hover:border-[#005BFF]/35 group-hover:bg-blue-50">
        <QuickSearchIcon type={iconType} brand={label} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

function QuickSearchIcon({
  type,
  brand,
}: {
  type: "brand" | "location" | "type"
  brand?: string
}) {
  if (type === "location") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" aria-hidden="true">
        <path
          d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (type === "type") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" aria-hidden="true">
        <path
          d="M4.8 5.8h6.7l7.7 7.7a2 2 0 0 1 0 2.8l-2.9 2.9a2 2 0 0 1-2.8 0L5.8 11.5V4.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8.5 8.5h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    )
  }

  const brandLogos: Record<string, string> = {
    audi: "/brand-logos/audi.png",
    bmw: "/brand-logos/bmw.png",
    ford: "/brand-logos/ford.png",
    honda: "/brand-logos/honda.png",
    hyundai: "/brand-logos/hyundai.png",
    kia: "/brand-logos/kia.png",
    "mercedes-benz": "/brand-logos/mercedes-benz.png",
    nissan: "/brand-logos/nissan.png",
    peugeot: "/brand-logos/peugeot.png",
    renault: "/brand-logos/renault.png",
    toyota: "/brand-logos/toyota.png",
    volkswagen: "/brand-logos/volkswagen.png",
  }

  const normalizedBrand = (brand || "").toLowerCase()
  const logoSrc = brandLogos[normalizedBrand]

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt=""
        className="max-h-7 max-w-8 object-contain"
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src="/icons/vehicle-silhouette.png"
      alt=""
      className="h-6 w-6 object-contain opacity-90"
      aria-hidden="true"
    />
  )
}
function buildListingsHref(params: ListingSearchParams) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })

  return `/listings?${query.toString()}`
}
function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string
  subtitle: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#0F172A]">{title}</h2>
        <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
      </div>
      <Link
        href={actionHref}
        className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#005BFF]/40 hover:text-[#005BFF]"
      >
        {actionLabel}
      </Link>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-[#64748B] shadow-sm">
      {text}
    </div>
  )
}

function HomeListingCard({
  car,
  onOpen,
  compact = false,
}: {
  car: any
  onOpen: () => void
  compact?: boolean
}) {
  const images = getListingImages(car)
  const premium = isPremiumListing(car)
  const [selectedImage, setSelectedImage] = useState(images[0] || "")
  const mainImage = selectedImage || images[0]
  const thumbnailImages = premium ? images.slice(0, 4) : []
  const hiddenImagesCount = premium ? Math.max(images.length - thumbnailImages.length, 0) : 0

  return (
    <article
      data-home-listing-id={String(car.id)}
      className={`group overflow-hidden rounded-xl bg-[#F8FAFC] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        premium
          ? "border border-amber-200 shadow-amber-100/60"
          : "border border-slate-200"
      }`}
    >
      <div className="relative overflow-hidden bg-slate-100">
        <Link
          href={`/cars/${car.id}`}
          onMouseDown={onOpen}
          onTouchStart={onOpen}
          onClick={onOpen}
          className="block"
        >
          <div className={compact ? "aspect-[4/3]" : "aspect-[16/10]"}>
            {mainImage ? (
              <img
                src={mainImage}
                alt={car.title || "Vehicle listing"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                No image
              </div>
            )}
          </div>
        </Link>

        <FavoriteButton
          listingId={String(car.id)}
          className="absolute right-2.5 top-2.5 h-9 w-9"
        />
      </div>

      {thumbnailImages.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5 border-b border-amber-100 bg-amber-50/50 px-2.5 py-1.5">
          {thumbnailImages.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => {
                if (hiddenImagesCount > 0 && index === thumbnailImages.length - 1) {
                  onOpen()
                  window.location.href = `/cars/${car.id}`
                  return
                }

                setSelectedImage(image)
              }}
              className={`relative block aspect-[4/3] overflow-hidden rounded-md border bg-transparent p-0 text-left ${
                image === mainImage ? "border-[#005BFF] ring-1 ring-[#005BFF]" : "border-white"
              }`}
              aria-label={
                hiddenImagesCount > 0 && index === thumbnailImages.length - 1
                  ? "Open listing gallery"
                  : `Show photo ${index + 1}`
              }
            >
              <img
                src={image}
                alt={`${car.title || "Vehicle listing"} photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {hiddenImagesCount > 0 && index === thumbnailImages.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-black text-white">
                  +{hiddenImagesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="p-3.5">
        <Link
          href={`/cars/${car.id}`}
          onMouseDown={onOpen}
          onTouchStart={onOpen}
          onClick={onOpen}
          className="block"
        >
          <h3 className="line-clamp-2 min-h-9 text-[13px] font-black leading-snug text-[#0F172A] transition hover:text-[#005BFF]">
            {car.title || "Untitled listing"}
          </h3>
        </Link>

        <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-semibold text-[#64748B]">
          <ListingCardMeta icon="year">{car.year || "-"}</ListingCardMeta>
          <ListingCardMeta icon="mileage">
            {car.mileage ? `${Number(car.mileage).toLocaleString("en-IE")} km` : "-"}
          </ListingCardMeta>
          <ListingCardMeta icon="fuel">{car.fuel || "-"}</ListingCardMeta>
          <ListingCardMeta icon="transmission">{car.transmission || "-"}</ListingCardMeta>
        </div>

        <p className="mt-3 text-lg font-black text-[#005BFF]">
          &euro;{Number(car.price || 0).toLocaleString("en-IE")}
        </p>

        <div className="mt-3 border-t border-slate-200/80 pt-2.5">
          <ListingStatusBadges listing={car} compact />
        </div>
      </div>
    </article>
  )
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2.5 text-sm font-black transition ${
        active
          ? "border-[#005BFF] text-[#005BFF]"
          : "border-transparent text-slate-600 hover:text-[#0F172A]"
      }`}
    >
      {children}
    </button>
  )
}

function AdvancedFilterGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-3 last:mb-0">
      <h3 className="mb-2 text-sm font-black text-slate-950">{title}</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {children}
      </div>
    </section>
  )
}

function SelectBox({
  id,
  label,
  value,
  setValue,
  options,
  disabled = false,
  prefix = "",
  suffix = "",
  featuredLabel,
  featuredCount = 0,
  dividerLabel,
  wideDropdown = false,
  openDropdown,
  setOpenDropdown,
}: {
  id: string
  label: string
  value: string
  setValue: (value: string) => void
  options: string[]
  disabled?: boolean
  prefix?: string
  suffix?: string
  featuredLabel?: string
  featuredCount?: number
  dividerLabel?: string
  wideDropdown?: boolean
  openDropdown: string | null
  setOpenDropdown: (value: string | null) => void
}) {
  const open = openDropdown === id
  const shouldFormatNumber = Boolean(prefix || suffix)
  const formatOption = (option: string) =>
    shouldFormatNumber && Number(option)
      ? Number(option).toLocaleString("en-IE")
      : option

  const displayValue = value ? `${prefix}${formatOption(value)}${suffix}` : label

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpenDropdown(open ? null : id)}
        className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-md border bg-white px-3.5 text-left text-sm font-semibold transition ${
          open
            ? "border-[#005BFF] bg-white ring-2 ring-blue-100"
            : "border-slate-300 hover:border-slate-500"
        } ${
          disabled
            ? "cursor-not-allowed bg-slate-50 text-slate-400"
            : value
              ? "text-[#0F172A]"
              : "text-[#64748B]"
        }`}
      >
        <span className="min-w-0 truncate">{displayValue}</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 flex-none text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 z-50 mt-2 max-h-80 overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-900/20 ${wideDropdown ? "w-[340px]" : "right-0"}`}>
          <button
            type="button"
            onClick={() => {
              setValue("")
              setOpenDropdown(null)
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#64748B] transition hover:bg-sky-50 hover:text-[#005BFF]"
          >
            {label}
          </button>

          {options.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-400">No options</p>
          )}

          {featuredLabel && featuredCount > 0 ? (
            <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
              {featuredLabel}
            </div>
          ) : null}

          {options.map((option, index) => (
            <div key={`${option}-${index}`}>
              {dividerLabel && index === featuredCount && index < options.length ? (
                <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
                  {dividerLabel}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setValue(option)
                  setOpenDropdown(null)
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#0F172A] transition hover:bg-sky-50 hover:text-[#005BFF]"
              >
                {prefix}
                {formatOption(option)}
                {suffix}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function unique(values: any[]) {
  return [...new Set(values.filter(Boolean).map(String))].sort()
}

function uniquePreserveOrder(values: any[]) {
  return [...new Set(values.filter(Boolean).map(String))]
}

function sortMakesForDropdown(values: string[], activeType: string) {
  const popular = getPopularMakes(activeType)
  const valueSet = new Set(values)
  const popularValues = popular.filter((make) => valueSet.has(make))
  const rest = values
    .filter((make) => !popular.includes(make) && make.toLowerCase() !== "other")
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }))

  return [
    ...popularValues,
    ...rest,
    ...(values.some((make) => make.toLowerCase() === "other") ? ["Other"] : []),
  ]
}

function getPopularMakes(activeType: string) {
  if (activeType === "motorcycles") return popularMotorcycleMakes
  if (activeType === "commercial") return popularCommercialMakes
  return popularMakes
}

function getBaseMakes(activeType: string) {
  if (activeType === "motorcycles") return motorcycleMakes
  if (activeType === "commercial") return commercialMakes
  return carMakes
}

function isPublicListing(car: any) {
  return isListingCurrentlyPublic(car)
}

function getListingMake(car: any) {
  return String(car.brand || car.make || "").trim()
}

function getListingModel(car: any) {
  return String(car.model || "").trim()
}

function isPremiumListing(car: any) {
  const premiumUntil = car.premium_until ? new Date(car.premium_until).getTime() : 0
  const premiumDateValid = !premiumUntil || premiumUntil > Date.now()
  const premiumValues = [
    car.is_premium,
    car.premium,
    car.premium_badge,
    car.homepage_featured,
    car.featured,
    car.is_featured,
    car.featured_listing,
    car.is_featured_listing,
    car.priority_search,
    car.vip,
    car.is_vip,
    car.vip_listing,
    car.is_vip_listing,
    car.boost,
    car.boosted,
    car.is_boosted,
    car.highlighted,
    car.is_highlighted,
    car.paid,
    car.is_paid,
    car.plan_type,
    car.plan,
    car.listing_plan,
    car.ad_type,
    car.package_type,
    car.package,
    car.product_type,
    car.search_visibility,
  ]

  return premiumDateValid && premiumValues.some(isPremiumValue)
}

function isPremiumValue(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value > 0

  const text = String(value || "").trim().toLowerCase()
  return ["1", "true", "yes", "premium", "featured", "vip", "boost", "boosted", "paid"].includes(text)
}

function getListingImages(car: any) {
  const images = Array.isArray(car.images) ? car.images : []
  const allImages = [car.featured_image_url, ...images]

  return Array.from(
    new Set(
      allImages
        .map((image) => String(image || "").trim())
        .filter(Boolean)
    )
  )
}

function sortNewestFirst(a: any, b: any) {
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
}







