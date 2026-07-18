"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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

const PAGE_SIZE = 18

const sortOptions = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price_desc", label: "Highest price" },
  { value: "price_asc", label: "Lowest price" },
  { value: "mileage_desc", label: "Highest mileage" },
  { value: "mileage_asc", label: "Lowest mileage" },
  { value: "rating_desc", label: "Highest rating" },
] as const

type SortOption = (typeof sortOptions)[number]["value"]

const priceOptions = [1000, 2000, 5000, 10000, 15000, 20000, 30000, 50000, 100000]
const yearOptions = Array.from({ length: 32 }, (_, i) => 2026 - i)
const mileageOptions = [10000, 25000, 50000, 75000, 100000, 150000, 200000, 300000]
const bodyTypes = ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible", "MPV", "Van"]
const colors = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Gold", "Other"]
const doorsOptions = ["2", "3", "4", "5"]
const seatsOptions = ["2", "4", "5", "6", "7", "8+"]
const registrationCountries = ["Ireland", "UK", "Northern Ireland", "Other"]
const sellerTypes = ["Private Seller", "Dealership"]
const popularCarMakes = ["Volkswagen", "Audi", "BMW", "Toyota", "Mercedes-Benz", "Ford", "Skoda", "Hyundai", "Nissan", "BYD"]
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

const carModels: Record<string, string[]> = {
  Abarth: ["124 Spider", "500", "595", "695", "Grande Punto", "Punto Evo", "Other"],
  "Alfa Romeo": ["145", "147", "155", "156", "159", "166", "4C", "Brera", "Giulia", "Giulietta", "GT", "GTV", "MiTo", "Spider", "Stelvio", "Tonale", "Other"],
  Audi: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "Allroad", "e-tron", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "R8", "RS3", "RS4", "RS5", "RS6", "RS7", "S3", "S4", "S5", "S6", "S7", "S8", "SQ5", "SQ7", "TT", "TTS", "Other"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "i3", "i4", "i5", "i7", "i8", "iX", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "M2", "M3", "M4", "M5", "M6", "M8", "Z3", "Z4", "Other"],
  BYD: ["Atto 3", "Dolphin", "Han", "Seal", "Seal U", "Tang", "Other"],
  Citroen: ["Berlingo", "C1", "C2", "C3", "C3 Aircross", "C4", "C4 Cactus", "C4 Picasso", "C5", "C5 Aircross", "C6", "Dispatch", "Grand C4 Picasso", "Relay", "Saxo", "Spacetourer", "Xsara Picasso", "Other"],
  Cupra: ["Ateca", "Born", "Formentor", "Leon", "Tavascan", "Terramar", "Other"],
  Dacia: ["Bigster", "Duster", "Jogger", "Logan", "Logan MCV", "Sandero", "Sandero Stepway", "Spring", "Other"],
  Fiat: ["124 Spider", "500", "500C", "500L", "500X", "Bravo", "Doblo", "Ducato", "Fiorino", "Grande Punto", "Panda", "Punto", "Qubo", "Scudo", "Tipo", "Other"],
  Ford: ["B-Max", "C-Max", "EcoSport", "Edge", "Explorer", "Fiesta", "Focus", "Fusion", "Galaxy", "Grand C-Max", "Ka", "Kuga", "Mondeo", "Mustang", "Puma", "Ranger", "S-Max", "Tourneo Connect", "Tourneo Custom", "Transit", "Transit Connect", "Transit Custom", "Other"],
  Honda: ["Accord", "Civic", "CR-V", "CR-Z", "e", "FR-V", "HR-V", "Insight", "Jazz", "Legend", "S2000", "Stream", "Other"],
  Hyundai: ["Accent", "Atos", "Bayon", "Coupe", "Elantra", "Getz", "i10", "i20", "i30", "i40", "Ioniq", "Ioniq 5", "Ioniq 6", "ix20", "ix35", "Kona", "Matrix", "Santa Fe", "Sonata", "Tucson", "Veloster", "Other"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "S-Type", "XE", "XF", "XJ", "XK", "X-Type", "Other"],
  Jeep: ["Avenger", "Cherokee", "Commander", "Compass", "Grand Cherokee", "Patriot", "Renegade", "Wrangler", "Other"],
  Kia: ["Carens", "Ceed", "Cerato", "EV3", "EV6", "EV9", "Niro", "Optima", "Picanto", "ProCeed", "Rio", "Sedona", "Sorento", "Soul", "Sportage", "Stinger", "Stonic", "Venga", "XCeed", "Other"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Freelander", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar", "Other"],
  Lexus: ["CT", "ES", "GS", "IS", "LBX", "LC", "LS", "NX", "RC", "RX", "RZ", "UX", "Other"],
  Mazda: ["2", "3", "5", "6", "CX-3", "CX-30", "CX-5", "CX-60", "CX-7", "CX-80", "MX-30", "MX-5", "RX-8", "Other"],
  "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "CL-Class", "CLA", "CLC", "CLK", "CLS", "E-Class", "EQA", "EQB", "EQC", "EQE", "EQS", "G-Class", "GL-Class", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "M-Class", "S-Class", "SL", "SLC", "SLK", "Sprinter", "V-Class", "Viano", "Vito", "Other"],
  MG: ["3", "4", "5", "HS", "MG3", "MG4", "MG5", "Marvel R", "ZS", "ZS EV", "Other"],
  Mini: ["Clubman", "Convertible", "Cooper", "Cooper S", "Countryman", "Coupe", "Hatch", "Paceman", "Roadster", "Other"],
  Mitsubishi: ["ASX", "Carisma", "Colt", "Eclipse Cross", "Grandis", "L200", "Lancer", "Mirage", "Outlander", "Pajero", "Shogun", "Space Star", "Other"],
  Nissan: ["350Z", "370Z", "Almera", "Ariya", "Cube", "Juke", "Leaf", "Micra", "Murano", "Navara", "Note", "Pathfinder", "Primera", "Pulsar", "Qashqai", "Tiida", "Townstar", "X-Trail", "Other"],
  Opel: ["Adam", "Agila", "Ampera", "Antara", "Astra", "Combo", "Corsa", "Crossland", "Crossland X", "Grandland", "Grandland X", "Insignia", "Karl", "Meriva", "Mokka", "Mokka X", "Signum", "Tigra", "Vectra", "Vivaro", "Zafira", "Other"],
  Peugeot: ["107", "108", "206", "207", "208", "2008", "306", "307", "308", "3008", "406", "407", "508", "5008", "Partner", "RCZ", "Rifter", "Traveller", "Expert", "Boxer", "Other"],
  Porsche: ["718", "911", "Boxster", "Cayenne", "Cayman", "Macan", "Panamera", "Taycan", "Other"],
  Renault: ["Arkana", "Captur", "Clio", "Espace", "Fluence", "Grand Scenic", "Kadjar", "Kangoo", "Koleos", "Laguna", "Megane", "Modus", "Scenic", "Symbioz", "Talisman", "Trafic", "Twingo", "Zoe", "Other"],
  Seat: ["Alhambra", "Altea", "Arona", "Arosa", "Ateca", "Cordoba", "Exeo", "Ibiza", "Leon", "Mii", "Tarraco", "Toledo", "Other"],
  Skoda: ["Citigo", "Enyaq", "Fabia", "Kamiq", "Karoq", "Kodiaq", "Octavia", "Rapid", "Roomster", "Scala", "Superb", "Yeti", "Other"],
  Subaru: ["BRZ", "Forester", "Impreza", "Justy", "Legacy", "Levorg", "Outback", "Tribeca", "WRX", "XV", "Other"],
  Suzuki: ["Alto", "Baleno", "Celerio", "Grand Vitara", "Ignis", "Jimny", "Kizashi", "Liana", "S-Cross", "Splash", "Swift", "SX4", "Vitara", "Wagon R", "Other"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Roadster", "Other"],
  Toyota: ["Auris", "Avensis", "Aygo", "Aygo X", "bZ4X", "C-HR", "Camry", "Celica", "Corolla", "Corolla Cross", "GT86", "Hiace", "Highlander", "Hilux", "IQ", "Land Cruiser", "Mirai", "MR2", "Previa", "Prius", "Proace", "RAV4", "Starlet", "Supra", "Urban Cruiser", "Verso", "Yaris", "Yaris Cross", "Other"],
  Volkswagen: ["Amarok", "Arteon", "Beetle", "Bora", "Caddy", "California", "Caravelle", "CC", "Crafter", "Eos", "Fox", "Golf", "ID.3", "ID.4", "ID.5", "ID.7", "Jetta", "Lupo", "Passat", "Phaeton", "Polo", "Scirocco", "Sharan", "T-Cross", "T-Roc", "Taigo", "Tiguan", "Touareg", "Touran", "Transporter", "Up", "Other"],
  Volvo: ["C30", "C40", "C70", "EX30", "EX40", "EX90", "S40", "S60", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90", "Other"],
  Other: ["Other"],
}

const motorcycleModels: Record<string, string[]> = {
  Aprilia: ["RS 125", "RS 457", "RS 660", "RSV4", "Tuareg 660", "Tuono 125", "Tuono 660", "Tuono V4", "Other"],
  BMW: ["C 400", "F 750 GS", "F 800 GS", "F 850 GS", "F 900 R", "F 900 XR", "G 310", "K 1600", "R 1200 GS", "R 1250 GS", "R 1250 RT", "R 1300 GS", "S 1000 R", "S 1000 RR", "S 1000 XR", "Other"],
  Ducati: ["Diavel", "Hypermotard", "Monster", "Multistrada", "Panigale", "Scrambler", "Streetfighter", "SuperSport", "Other"],
  "Harley-Davidson": ["Breakout", "Dyna", "Fat Boy", "Forty-Eight", "Heritage Classic", "Iron 883", "Low Rider", "Nightster", "Road Glide", "Road King", "Softail", "Sportster", "Street Bob", "Street Glide", "Other"],
  Honda: ["CB125F", "CB500F", "CB650R", "CBR500R", "Africa Twin", "Gold Wing", "Other"],
  Husqvarna: ["701 Enduro", "701 Supermoto", "Norden 901", "Svartpilen 125", "Svartpilen 401", "Vitpilen 401", "Other"],
  Kawasaki: ["Ninja 400", "Ninja 650", "Z650", "Z900", "Versys", "Other"],
  KTM: ["125 Duke", "390 Duke", "690 Duke", "790 Duke", "890 Duke", "1290 Super Duke", "Adventure", "EXC", "SX", "Other"],
  "Moto Guzzi": ["California", "Stelvio", "V7", "V85 TT", "V9", "Other"],
  Piaggio: ["Beverly", "Liberty", "Medley", "MP3", "Typhoon", "Other"],
  "Royal Enfield": ["Bullet", "Classic", "Continental GT", "Himalayan", "Hunter", "Interceptor", "Meteor", "Other"],
  Suzuki: ["Bandit", "Burgman", "GSX-R", "GSX-S", "Hayabusa", "SV650", "V-Strom", "V-Strom 650", "V-Strom 1000", "Other"],
  Triumph: ["Bonneville", "Rocket", "Scrambler", "Speed Triple", "Street Triple", "Tiger", "Tiger Sport", "Trident", "Other"],
  Vespa: ["GTS", "GTV", "Primavera", "Sprint", "Other"],
  Yamaha: ["MT-03", "MT-07", "MT-09", "MT-10", "NMAX", "R1", "R3", "R6", "TMAX", "Tracer 7", "Tracer 9", "XMAX", "XSR700", "XSR900", "Other"],
  Other: ["Other"],
}

const commercialModels: Record<string, string[]> = {
  Citroen: ["Berlingo", "Dispatch", "Relay", "Other"],
  DAF: ["CF", "LF", "XF", "XG", "Other"],
  Fiat: ["Doblo", "Ducato", "Scudo", "Other"],
  Ford: ["Connect", "Courier", "Ranger", "Tourneo Connect", "Tourneo Custom", "Transit", "Transit Connect", "Transit Courier", "Transit Custom", "Other"],
  Iveco: ["Daily", "Eurocargo", "S-Way", "Other"],
  MAN: ["TGE", "TGL", "TGM", "TGX", "Other"],
  "Mercedes-Benz": ["Citan", "Sprinter", "Vito", "X-Class", "Other"],
  Nissan: ["Interstar", "Kubistar", "NV200", "NV300", "NV400", "Primastar", "Townstar", "Other"],
  Opel: ["Combo", "Vivaro", "Movano", "Other"],
  Peugeot: ["Bipper", "Boxer", "Expert", "Partner", "Rifter", "Other"],
  Renault: ["Kangoo", "Master", "Trafic", "Other"],
  Scania: ["G Series", "P Series", "R Series", "S Series", "Other"],
  Toyota: ["Dyna", "Hilux", "Proace", "Proace City", "Other"],
  Volkswagen: ["Amarok", "Caddy", "Crafter", "Transporter", "Other"],
  Volvo: ["FE", "FH", "FL", "FM", "Other"],
  Other: ["Other"],
}

type ListingsClientProps = {
  initialListings?: any[]
  hasInitialListings?: boolean
}

export default function ListingsClient({
  initialListings = [],
  hasInitialListings = false,
}: ListingsClientProps) {
  return (
    <Suspense fallback={<ListingsLoading />}>
      <ListingsContent
        initialListings={initialListings}
        hasInitialListings={hasInitialListings}
      />
    </Suspense>
  )
}

function ListingsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="mt-6 h-40 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </main>
  )
}

function ListingsContent({
  initialListings,
  hasInitialListings,
}: Required<ListingsClientProps>) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const storageKey = useMemo(
    () => `autodeal-listings-position-${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  )

  const restoredRef = useRef(false)
  const searchPanelRef = useRef<HTMLDivElement | null>(null)

  const [allListings, setAllListings] = useState<any[]>(initialListings)
  const [listings, setListings] = useState<any[]>(initialListings)
  const [loading, setLoading] = useState(!hasInitialListings)
  const [userId, setUserId] = useState("")
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeType, setActiveType] = useState(searchParams.get("type") || "cars")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [keyword, setKeyword] = useState(searchParams.get("q") || "")
  const [sortOption, setSortOption] = useState<SortOption>("best")

  const [brand, setBrand] = useState(searchParams.get("brand") || "")
  const [model, setModel] = useState(searchParams.get("model") || "")
  const [priceFrom, setPriceFrom] = useState(searchParams.get("priceFrom") || "")
  const [priceTo, setPriceTo] = useState(searchParams.get("priceTo") || "")
  const [yearFrom, setYearFrom] = useState(searchParams.get("yearFrom") || "")
  const [yearTo, setYearTo] = useState(searchParams.get("yearTo") || "")
  const [mileageFrom, setMileageFrom] = useState(searchParams.get("mileageFrom") || "")
  const [mileageTo, setMileageTo] = useState(searchParams.get("mileageTo") || "")
  const [fuel, setFuel] = useState(searchParams.get("fuel") || "")
  const [transmission, setTransmission] = useState(searchParams.get("transmission") || "")
  const [bodyType, setBodyType] = useState(searchParams.get("bodyType") || "")
  const [color, setColor] = useState(searchParams.get("color") || "")
  const [doors, setDoors] = useState(searchParams.get("doors") || "")
  const [seats, setSeats] = useState(searchParams.get("seats") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [registrationCountry, setRegistrationCountry] = useState(searchParams.get("registrationCountry") || "")
  const [sellerType, setSellerType] = useState(searchParams.get("sellerType") || "")

 const savePosition = useCallback(
  (listingId?: string) => {
    if (typeof window === "undefined") return

    let existingListingId = ""

    try {
      const existing = sessionStorage.getItem(storageKey)
      if (existing) {
        existingListingId = JSON.parse(existing).listingId || ""
      }
    } catch {}

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        page: currentPage,
        scrollY: window.scrollY,
        listingId: listingId || existingListingId,
      })
    )
  },
  [storageKey, currentPage]
)

  const loadListings = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
    }

    fetch("/api/listing-expiry", {
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

      if (error) {
        if (!silent) {
          setAllListings([])
        }
        return
      }

      const publicListings = (data || []).filter(isPublicListing)

      setAllListings(publicListings)
    } catch {
      if (!silent) {
        setAllListings([])
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])


  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }

    loadListings({ silent: hasInitialListings })
  }, [hasInitialListings, loadListings])

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
  }, [loadListings])

  useEffect(() => {
    const onScroll = () => savePosition()
    const onPageHide = () => savePosition()

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pagehide", onPageHide)

    return () => {
      onPageHide()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [savePosition])

  useEffect(() => {
    function closeDropdownOnOutsideClick(event: MouseEvent | TouchEvent) {
      if (!openDropdown) return

      const target = event.target as Node | null

      if (searchPanelRef.current && target && !searchPanelRef.current.contains(target)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener("mousedown", closeDropdownOnOutsideClick)
    document.addEventListener("touchstart", closeDropdownOnOutsideClick)

    return () => {
      document.removeEventListener("mousedown", closeDropdownOnOutsideClick)
      document.removeEventListener("touchstart", closeDropdownOnOutsideClick)
    }
  }, [openDropdown])

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
    if (allListings.length > 0) {
      searchListings(false)
    }
  }, [
    allListings,
    activeType,
    keyword,
    brand,
    model,
    priceFrom,
    priceTo,
    yearFrom,
    yearTo,
    mileageFrom,
    mileageTo,
    fuel,
    transmission,
    bodyType,
    color,
    doors,
    seats,
    location,
    registrationCountry,
    sellerType,
  ])

  useEffect(() => {
    const nextType = searchParams.get("type") || "cars"
    const nextKeyword = searchParams.get("q") || ""
    const inferredFilters = inferSearchFiltersFromQuery(nextKeyword, nextType, allListings)

    setActiveType(nextType)
    setKeyword(nextKeyword)
    setBrand(searchParams.get("brand") || inferredFilters.brand || "")
    setModel(searchParams.get("model") || inferredFilters.model || "")
    setPriceFrom(searchParams.get("priceFrom") || "")
    setPriceTo(searchParams.get("priceTo") || "")
    setYearFrom(searchParams.get("yearFrom") || "")
    setYearTo(searchParams.get("yearTo") || "")
    setMileageFrom(searchParams.get("mileageFrom") || "")
    setMileageTo(searchParams.get("mileageTo") || "")
    setFuel(searchParams.get("fuel") || "")
    setTransmission(searchParams.get("transmission") || "")
    setBodyType(searchParams.get("bodyType") || "")
    setColor(searchParams.get("color") || "")
    setDoors(searchParams.get("doors") || "")
    setSeats(searchParams.get("seats") || "")
    setLocation(searchParams.get("location") || "")
    setRegistrationCountry(searchParams.get("registrationCountry") || "")
    setSellerType(searchParams.get("sellerType") || "")
    setOpenDropdown(null)
    restoredRef.current = true
    setCurrentPage(1)
    sessionStorage.removeItem(storageKey)
  }, [searchParams, allListings, storageKey])

  function getVehicleType(car: any) {
    return String(
      car.vehicle_type ||
        car.category ||
        car.listing_type ||
        car.type ||
        "cars"
    ).toLowerCase()
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
      brand
        ? sortWithOtherLast([
            ...getBaseModels(activeType, brand),
            ...typeListings
              .filter((car) => getListingMake(car) === brand)
              .map((car) => getListingModel(car)),
          ])
        : [],
    [typeListings, activeType, brand]
  )

  const fuels = useMemo(() => unique(typeListings.map((car) => car.fuel)), [typeListings])
  const transmissions = useMemo(() => unique(typeListings.map((car) => car.transmission)), [typeListings])
  const locations = useMemo(() => unique(typeListings.map((car) => car.location)), [typeListings])

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))

  const sortedListings = useMemo(() => {
    const results = [...listings]

    if (sortOption === "newest") {
      return results.sort((a, b) => getListingDateMs(b) - getListingDateMs(a))
    }

    if (sortOption === "oldest") {
      return results.sort((a, b) => getListingDateMs(a) - getListingDateMs(b))
    }

    if (sortOption === "price_desc") {
      return results.sort((a, b) => getNumberValue(b.price) - getNumberValue(a.price))
    }

    if (sortOption === "price_asc") {
      return results.sort((a, b) => getNumberValue(a.price) - getNumberValue(b.price))
    }

    if (sortOption === "mileage_desc") {
      return results.sort((a, b) => getNumberValue(b.mileage) - getNumberValue(a.mileage))
    }

    if (sortOption === "mileage_asc") {
      return results.sort((a, b) => getNumberValue(a.mileage) - getNumberValue(b.mileage))
    }

    if (sortOption === "rating_desc") {
      return results.sort((a, b) => getListingRating(b) - getListingRating(a))
    }

    return results
  }, [listings, sortOption])

  const visibleListings = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    return sortedListings.slice(start, start + PAGE_SIZE)
  }, [sortedListings, currentPage, totalPages])

  useEffect(() => {
    if (loading || restoredRef.current || listings.length === 0) return

    const savedRaw = sessionStorage.getItem(storageKey)

    if (!savedRaw) {
      restoredRef.current = true
      return
    }

    let savedPage = 1
    let savedY = 0
    let savedListingId = ""

    try {
      const saved = JSON.parse(savedRaw)
      savedPage = Number(saved.page) || 1
      savedY = Number(saved.scrollY) || 0
      savedListingId = String(saved.listingId || "")
    } catch {
      restoredRef.current = true
      return
    }

    const targetPage = Math.min(Math.max(savedPage, 1), totalPages)

    if (currentPage !== targetPage) {
      setCurrentPage(targetPage)
      return
    }

    restoredRef.current = true

    let attempts = 0
    const maxAttempts = 40

    const restore = () => {
      attempts += 1

      const card = savedListingId
        ? document.querySelector(`[data-listing-id="${savedListingId}"]`)
        : null

      if (card) {
        card.scrollIntoView({
          block: "center",
          behavior: "auto",
        })
      }

      if (savedY > 0) {
        window.scrollTo({
          top: savedY,
          behavior: "auto",
        })
      }

      const closeEnough = Math.abs(window.scrollY - savedY) < 12

      if (!closeEnough && attempts < maxAttempts) {
        requestAnimationFrame(restore)
      }
    }

    requestAnimationFrame(restore)
  }, [loading, listings.length, storageKey, currentPage, totalPages])

  function searchListings(resetPage = true) {
    let results = [...typeListings]

    if (keyword) {
      const normalizedKeyword = normalizeSearchText(keyword)

      results = results.filter((car) => {
        const searchableText = [
          car.title,
          car.brand,
          car.make,
          car.model,
          car.year,
          car.location,
          car.fuel,
          car.transmission,
          car.body_type,
          car.color,
          car.description,
        ]
          .map(normalizeSearchText)
          .join(" ")

        return searchableText.includes(normalizedKeyword)
      })
    }

    if (brand) results = results.filter((car) => getListingMake(car) === brand)
    if (model) results = results.filter((car) => getListingModel(car) === model)
    if (priceFrom) results = results.filter((car) => Number(car.price) >= Number(priceFrom))
    if (priceTo) results = results.filter((car) => Number(car.price) <= Number(priceTo))
    if (yearFrom) results = results.filter((car) => Number(car.year) >= Number(yearFrom))
    if (yearTo) results = results.filter((car) => Number(car.year) <= Number(yearTo))
    if (mileageFrom) results = results.filter((car) => Number(car.mileage) >= Number(mileageFrom))
    if (mileageTo) results = results.filter((car) => Number(car.mileage) <= Number(mileageTo))
    if (fuel) results = results.filter((car) => car.fuel === fuel)
    if (transmission) results = results.filter((car) => car.transmission === transmission)
    if (bodyType) results = results.filter((car) => car.body_type === bodyType)
    if (color) results = results.filter((car) => car.color === color)
    if (doors) results = results.filter((car) => String(car.doors) === doors)
    if (seats) results = results.filter((car) => String(car.seats) === seats)
    if (location) results = results.filter((car) => car.location === location)
    if (registrationCountry) results = results.filter((car) => car.registration_country === registrationCountry)
    if (sellerType) results = results.filter((car) => car.seller_type === sellerType)

    setListings(results)

    if (resetPage) {
      saveCurrentSearchToHistory()
      restoredRef.current = true
      setCurrentPage(1)
      sessionStorage.removeItem(storageKey)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }

    setOpenDropdown(null)
  }

  function saveCurrentSearchToHistory() {
    if (!userId) return

    const query = buildSearchHistoryLabel()
    if (!query) return

    setSearchHistory(
      saveSearchHistory(userId, {
        query,
        href: buildListingsHrefFromCurrentFilters(),
      })
    )
  }

  function openHistorySearch(entry: SearchHistoryEntry) {
    router.push(entry.href)
  }

  function buildSearchHistoryLabel() {
    return (
      keyword ||
      [
        brand,
        model,
        location,
        fuel,
        transmission,
        bodyType,
        priceFrom ? `from €${Number(priceFrom).toLocaleString("en-IE")}` : "",
        priceTo ? `to €${Number(priceTo).toLocaleString("en-IE")}` : "",
        yearFrom ? `from ${yearFrom}` : "",
        yearTo ? `to ${yearTo}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    ).trim()
  }

  function buildListingsHrefFromCurrentFilters() {
    const params = new URLSearchParams()

    setParam(params, "type", activeType === "cars" ? "" : activeType)
    setParam(params, "q", keyword)
    setParam(params, "brand", brand)
    setParam(params, "model", model)
    setParam(params, "priceFrom", priceFrom)
    setParam(params, "priceTo", priceTo)
    setParam(params, "yearFrom", yearFrom)
    setParam(params, "yearTo", yearTo)
    setParam(params, "mileageFrom", mileageFrom)
    setParam(params, "mileageTo", mileageTo)
    setParam(params, "fuel", fuel)
    setParam(params, "transmission", transmission)
    setParam(params, "bodyType", bodyType)
    setParam(params, "color", color)
    setParam(params, "doors", doors)
    setParam(params, "seats", seats)
    setParam(params, "location", location)
    setParam(params, "registrationCountry", registrationCountry)
    setParam(params, "sellerType", sellerType)

    const queryString = params.toString()
    return queryString ? `/listings?${queryString}` : "/listings"
  }

  function resetSearch() {
    setKeyword("")
    setBrand("")
    setModel("")
    setPriceFrom("")
    setPriceTo("")
    setYearFrom("")
    setYearTo("")
    setMileageFrom("")
    setMileageTo("")
    setFuel("")
    setTransmission("")
    setBodyType("")
    setColor("")
    setDoors("")
    setSeats("")
    setLocation("")
    setRegistrationCountry("")
    setSellerType("")
    setListings(typeListings)
    setCurrentPage(1)
    setOpenDropdown(null)
    restoredRef.current = true
    sessionStorage.removeItem(storageKey)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goToPage(page: number) {
    const safePage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(safePage)
    sessionStorage.removeItem(storageKey)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            ← Back
          </Link>

          <span className="text-sm text-gray-500">Listings</span>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold md:text-4xl">
            Cars for Sale Ireland
          </h1>
          <p className="mt-3 text-gray-500">
            Found {listings.length} vehicles for sale
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="self-start">
            <div ref={searchPanelRef} className="rounded-2xl border border-slate-300 bg-white shadow-md shadow-slate-900/[0.06]">
              <SearchPanel
                activeType={activeType}
                setActiveType={setActiveType}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                brand={brand}
                setBrand={setBrand}
                model={model}
                setModel={setModel}
                priceFrom={priceFrom}
                setPriceFrom={setPriceFrom}
                priceTo={priceTo}
                setPriceTo={setPriceTo}
                yearFrom={yearFrom}
                setYearFrom={setYearFrom}
                yearTo={yearTo}
                setYearTo={setYearTo}
                mileageFrom={mileageFrom}
                setMileageFrom={setMileageFrom}
                mileageTo={mileageTo}
                setMileageTo={setMileageTo}
                fuel={fuel}
                setFuel={setFuel}
                transmission={transmission}
                setTransmission={setTransmission}
                bodyType={bodyType}
                setBodyType={setBodyType}
                color={color}
                setColor={setColor}
                doors={doors}
                setDoors={setDoors}
                seats={seats}
                setSeats={setSeats}
                location={location}
                setLocation={setLocation}
                registrationCountry={registrationCountry}
                setRegistrationCountry={setRegistrationCountry}
                sellerType={sellerType}
                setSellerType={setSellerType}
                brands={brands}
                models={models}
                fuels={fuels}
                transmissions={transmissions}
                locations={locations}
                keyword={keyword}
                searchHistory={searchHistory}
                openHistorySearch={openHistorySearch}
                searchListings={() => searchListings(true)}
                resetSearch={resetSearch}
              />
            </div>
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  Showing {visibleListings.length} of {listings.length} results
                </p>
                <p className="text-sm text-gray-500">
                  Browse vehicles listed on AutoDeal.ie
                </p>
              </div>

              <select
                value={sortOption}
                onChange={(event) => {
                  setSortOption(event.target.value as SortOption)
                  setCurrentPage(1)
                  restoredRef.current = true
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600"
                aria-label="Sort listings"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && <p className="text-gray-500">Loading listings...</p>}

            {!loading && visibleListings.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                No listings found.
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleListings.map((car) => (
                <ListingCard
                  key={car.id}
                  car={car}
                  onOpen={() => savePosition(String(car.id))}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function SearchPanel(props: any) {
  const activeFilters = [
    props.keyword,
    props.brand,
    props.model,
    props.priceFrom,
    props.priceTo,
    props.yearFrom,
    props.yearTo,
    props.mileageFrom,
    props.mileageTo,
    props.fuel,
    props.transmission,
    props.bodyType,
    props.color,
    props.doors,
    props.seats,
    props.location,
    props.registrationCountry,
    props.sellerType,
  ].filter(Boolean).length

  return (
    <div className="rounded-2xl">
      <div className="border-b border-slate-300 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#005BFF]">
              Refine search
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Filters
            </h2>
          </div>

          <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold text-[#005BFF] shadow-sm">
            {activeFilters} active
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-300 bg-slate-50 p-1.5">
          <TypeButton
            active={props.activeType === "cars"}
            onClick={() => props.setActiveType("cars")}
          >
            Cars
          </TypeButton>
          <TypeButton
            active={props.activeType === "motorcycles"}
            onClick={() => props.setActiveType("motorcycles")}
          >
            Motorcycles
          </TypeButton>
          <TypeButton
            active={props.activeType === "commercial"}
            onClick={() => props.setActiveType("commercial")}
          >
            Commercial
          </TypeButton>
        </div>

        {props.searchHistory.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Recent searches
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {props.searchHistory.slice(0, 5).map((entry: SearchHistoryEntry) => (
                <button
                  type="button"
                  key={`${entry.query}-${entry.createdAt}`}
                  onClick={() => props.openHistorySearch(entry)}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-[#005BFF]"
                >
                  <SearchIcon small />
                  {entry.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 p-5">
        <FilterGroup title="Vehicle">
          <div className="grid grid-cols-2 gap-3">
            <SelectBox id="brand" label="Make" placeholder="Any make" value={props.brand} setValue={(v) => {
              props.setBrand(v)
              props.setModel("")
            }} options={props.brands} featuredLabel="Popular" featuredCount={getPopularMakes(props.activeType).length} dividerLabel="All makes" wideDropdown openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />

            <SelectBox id="model" label="Model" placeholder="Any model" value={props.model} setValue={props.setModel} options={props.models} disabled={!props.brand} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
          </div>
        </FilterGroup>

        <FilterGroup title="Budget and year">
          <div className="grid grid-cols-2 gap-3">
            <SelectBox id="priceFrom" label="Min price" placeholder="No min" value={props.priceFrom} setValue={props.setPriceFrom} options={priceOptions.map(String)} prefix="€" openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
            <SelectBox id="priceTo" label="Max price" placeholder="No max" value={props.priceTo} setValue={props.setPriceTo} options={priceOptions.map(String)} prefix="€" openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />

            <SelectBox id="yearFrom" label="Year from" placeholder="Any" value={props.yearFrom} setValue={props.setYearFrom} options={yearOptions.map(String)} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
            <SelectBox id="yearTo" label="Year to" placeholder="Any" value={props.yearTo} setValue={props.setYearTo} options={yearOptions.map(String)} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
          </div>
        </FilterGroup>

        {props.showAdvanced && (
          <div className="space-y-5 rounded-2xl border border-slate-300 bg-slate-50 p-4">
            <FilterGroup title="Mileage">
              <div className="grid grid-cols-2 gap-3">
                <SelectBox id="mileageFrom" label="Min mileage" placeholder="No min" value={props.mileageFrom} setValue={props.setMileageFrom} options={mileageOptions.map(String)} suffix=" km" openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="mileageTo" label="Max mileage" placeholder="No max" value={props.mileageTo} setValue={props.setMileageTo} options={mileageOptions.map(String)} suffix=" km" openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
              </div>
            </FilterGroup>

            <FilterGroup title="Engine and spec">
              <div className="grid grid-cols-2 gap-3">
                <SelectBox id="fuel" label="Fuel" placeholder="Any fuel" value={props.fuel} setValue={props.setFuel} options={props.fuels} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="transmission" label="Gearbox" placeholder="Any" value={props.transmission} setValue={props.setTransmission} options={props.transmissions} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="bodyType" label="Body type" placeholder="Any" value={props.bodyType} setValue={props.setBodyType} options={bodyTypes} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="color" label="Colour" placeholder="Any" value={props.color} setValue={props.setColor} options={colors} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="doors" label="Doors" placeholder="Any" value={props.doors} setValue={props.setDoors} options={doorsOptions} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="seats" label="Seats" placeholder="Any" value={props.seats} setValue={props.setSeats} options={seatsOptions} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
              </div>
            </FilterGroup>

            <FilterGroup title="Seller and location">
              <div className="grid grid-cols-2 gap-3">
                <SelectBox id="location" label="Location" placeholder="All Ireland" value={props.location} setValue={props.setLocation} options={props.locations} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="registrationCountry" label="Registered" placeholder="Any" value={props.registrationCountry} setValue={props.setRegistrationCountry} options={registrationCountries} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
                <SelectBox id="sellerType" label="Seller" placeholder="Any seller" value={props.sellerType} setValue={props.setSellerType} options={sellerTypes} openDropdown={props.openDropdown} setOpenDropdown={props.setOpenDropdown} />
              </div>
            </FilterGroup>
          </div>
        )}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => props.setShowAdvanced(!props.showAdvanced)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#005BFF] transition hover:bg-blue-100"
          >
            {props.showAdvanced ? "Hide advanced filters" : "More filters"}
            <span aria-hidden="true">{props.showAdvanced ? "↑" : "↓"}</span>
          </button>

          <button
            type="button"
            onClick={props.searchListings}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#005BFF_0%,#1677FF_55%,#00A3FF_100%)] py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98]"
          >
            <SearchIcon />
            Search listings
          </button>

          <button
            type="button"
            onClick={props.resetSearch}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-900 transition hover:border-blue-400 hover:bg-slate-50 hover:text-[#005BFF]"
          >
            Clear all filters
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ListingCard({
  car,
  onOpen,
}: {
  car: any
  onOpen: () => void
}) {
  const images = getListingImages(car)
  const premium = isPremiumListing(car)
  const [selectedImage, setSelectedImage] = useState(images[0] || "")
  const image = selectedImage || images[0]
  const thumbnailImages = premium ? images.slice(0, 4) : []
  const hiddenImagesCount = premium ? Math.max(images.length - thumbnailImages.length, 0) : 0

  return (
    <article
      data-listing-id={String(car.id)}
      className={`group overflow-hidden rounded-xl bg-[#F8FAFC] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        premium
          ? "border border-amber-200 shadow-amber-100/60"
          : "border border-gray-200"
      }`}
    >
      <div className="relative h-44 overflow-hidden bg-gray-100 sm:h-48">
        <Link
          href={`/cars/${car.id}`}
          onMouseDown={onOpen}
          onTouchStart={onOpen}
          onClick={onOpen}
          className="block h-full"
        >
          {image ? (
            <img
              src={image}
              alt={car.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </Link>

        {car.brand && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-bold text-white">
            {car.brand}
          </span>
        )}

        <FavoriteButton
          listingId={String(car.id)}
          className="absolute right-2.5 top-2.5 h-9 w-9"
        />
      </div>

      {thumbnailImages.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5 border-b border-amber-100 bg-amber-50/50 px-2.5 py-1.5">
          {thumbnailImages.map((thumbnail, index) => (
            <button
              type="button"
              key={`${thumbnail}-${index}`}
              onClick={() => {
                if (hiddenImagesCount > 0 && index === thumbnailImages.length - 1) {
                  onOpen()
                  window.location.href = `/cars/${car.id}`
                  return
                }

                setSelectedImage(thumbnail)
              }}
              className={`relative block aspect-[4/3] overflow-hidden rounded-md border bg-transparent p-0 text-left ${
                thumbnail === image ? "border-[#005BFF] ring-1 ring-[#005BFF]" : "border-white"
              }`}
              aria-label={
                hiddenImagesCount > 0 && index === thumbnailImages.length - 1
                  ? "Open listing gallery"
                  : `Show photo ${index + 1}`
              }
            >
              <img
                src={thumbnail}
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

      <div className="p-4">
        <Link
          href={`/cars/${car.id}`}
          onMouseDown={onOpen}
          onTouchStart={onOpen}
          onClick={onOpen}
          className="block"
        >
          <h3 className="line-clamp-2 min-h-10 text-base font-bold leading-snug hover:text-blue-600">
            {car.title}
          </h3>
        </Link>

        <p className="mt-2 text-xl font-extrabold text-blue-600">
          €{Number(car.price || 0).toLocaleString("en-IE")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs font-semibold text-gray-500">
          <ListingCardMeta icon="year">{car.year || "—"}</ListingCardMeta>
          <ListingCardMeta icon="mileage">
            {car.mileage
              ? `${Number(car.mileage).toLocaleString("en-IE")} km`
              : "—"}
          </ListingCardMeta>
          <ListingCardMeta icon="transmission">{car.transmission || "—"}</ListingCardMeta>
          <ListingCardMeta icon="fuel">{car.fuel || "—"}</ListingCardMeta>
          <span className="col-span-2">
            <ListingCardMeta icon="location">{car.location || "Ireland"}</ListingCardMeta>
          </span>
        </div>

        <div className="mt-3">
          <ListingStatusBadges listing={car} compact />
        </div>

        <Link
          href={`/cars/${car.id}`}
          onMouseDown={onOpen}
          onTouchStart={onOpen}
          onClick={onOpen}
          className="mt-4 block border-t border-gray-200/80 pt-3 text-center text-sm font-bold text-blue-600 hover:text-blue-700"
        >
          View Details
        </Link>
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
      className={`flex min-h-12 items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-[#005BFF] shadow-sm ring-1 ring-slate-300"
          : "text-slate-700 hover:bg-white hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  )
}

function SearchIcon({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={small ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" aria-hidden="true">
      <path d="m20 20-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function unique(values: any[]) {
  return sortWithOtherLast(values)
}

function uniquePreserveOrder(values: any[]) {
  return Array.from(new Set(values.filter(Boolean).map(String)))
}

function sortWithOtherLast(values: any[]) {
  const normalized = uniquePreserveOrder(values)
  const regular = normalized
    .filter((value) => value.toLowerCase() !== "other")
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }))

  return normalized.some((value) => value.toLowerCase() === "other")
    ? [...regular, "Other"]
    : regular
}

function sortMakesForDropdown(values: string[], activeType: string) {
  const popular = getPopularMakes(activeType)
  const valueSet = new Set(values)
  const popularValues = popular.filter((make) => valueSet.has(make))
  const regularValues = values.filter(
    (make) => make.toLowerCase() !== "other"
  )

  return [
    ...popularValues,
    ...regularValues.sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base", numeric: true })
    ),
    ...(values.some((make) => make.toLowerCase() === "other") ? ["Other"] : []),
  ]
}

function getPopularMakes(activeType: string) {
  if (activeType === "motorcycles") return popularMotorcycleMakes
  if (activeType === "commercial") return popularCommercialMakes
  return popularCarMakes
}

function getBaseMakes(activeType: string) {
  if (activeType === "motorcycles") return motorcycleMakes
  if (activeType === "commercial") return commercialMakes
  return carMakes
}

function getBaseModels(activeType: string, make: string) {
  if (activeType === "motorcycles") return motorcycleModels[make] || []
  if (activeType === "commercial") return commercialModels[make] || []
  return carModels[make] || []
}

function SelectBox({
  id,
  label,
  placeholder,
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
  placeholder?: string
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

  const fallbackLabel = placeholder || label
  const displayValue = value
    ? `${prefix}${Number(value) ? Number(value).toLocaleString("en-IE") : value}${suffix}`
    : fallbackLabel

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpenDropdown(open ? null : id)}
        className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition ${
          open ? "border-[#005BFF] ring-2 ring-blue-100" : "border-slate-300 hover:border-blue-400"
        } ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "text-slate-950"}`}
      >
        <span className={`min-w-0 whitespace-nowrap truncate ${value ? "text-slate-950" : "text-slate-700"}`}>
          {displayValue}
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 flex-none text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 z-50 mt-2 max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 ${wideDropdown ? "w-[300px]" : "right-0"}`}>
          <button
            type="button"
            onClick={() => {
              setValue("")
              setOpenDropdown(null)
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-blue-50 hover:text-[#005BFF]"
          >
            {fallbackLabel}
          </button>

          {featuredLabel && featuredCount > 0 ? (
            <div className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">
              {featuredLabel}
            </div>
          ) : null}

          {options.length === 0 && (
            <p className="px-3 py-3 text-sm text-gray-400">No options</p>
          )}

          <div className="flex flex-col">
          {options.map((option, index) => (
            <div key={`${option}-${index}`} className="block">
              {dividerLabel && index === featuredCount && index < options.length ? (
                <div className="mt-1 border-t border-slate-200 px-3 pb-1 pt-3 text-xs font-semibold text-slate-500">
                  {dividerLabel}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setValue(option)
                  setOpenDropdown(null)
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-[#005BFF]"
              >
                {prefix}
                {Number(option) ? Number(option).toLocaleString("en-IE") : option}
                {suffix}
              </button>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
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

function getNumberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getListingDateMs(car: any) {
  const value = new Date(car.created_at || 0).getTime()
  return Number.isFinite(value) ? value : 0
}

function getListingRating(car: any) {
  return Math.max(
    getNumberValue(car.rating),
    getNumberValue(car.review_rating),
    getNumberValue(car.rating_score),
    getNumberValue(car.seller_rating)
  )
}

function isPremiumListing(car: Record<string, unknown>) {
  const premiumUntilValue = typeof car.premium_until === "string" ? car.premium_until : ""
  const premiumUntil = premiumUntilValue ? new Date(premiumUntilValue).getTime() : 0
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

function getListingImages(car: Record<string, unknown>) {
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

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function inferSearchFiltersFromQuery(query: string, activeType: string, listings: any[]) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return { brand: "", model: "" }

  const makes = sortMakesForDropdown(
    uniquePreserveOrder([
      ...getBaseMakes(activeType),
      ...listings.map((car) => getListingMake(car)),
    ]),
    activeType
  )

  const brand =
    makes
      .filter((make) => make.toLowerCase() !== "other")
      .sort((a, b) => b.length - a.length)
      .find((make) => searchTextIncludesValue(normalizedQuery, make)) || ""

  if (!brand) return { brand: "", model: "" }

  const models = sortWithOtherLast([
    ...getBaseModels(activeType, brand),
    ...listings
      .filter((car) => getListingMake(car) === brand)
      .map((car) => getListingModel(car)),
  ])

  const model =
    models
      .filter((item) => item.toLowerCase() !== "other")
      .sort((a, b) => b.length - a.length)
      .find((item) => searchTextIncludesValue(normalizedQuery, item)) || ""

  return { brand, model }
}

function searchTextIncludesValue(text: string, value: string) {
  const normalizedValue = normalizeSearchText(value)
  if (!normalizedValue) return false

  return new RegExp(`(^|\\s)${escapeRegExp(normalizedValue)}(\\s|$)`).test(text)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function setParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value)
  }
}


