"use client"

import {
  Suspense,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  FREE_PLAN,
  PREMIUM_BOOST,
  freeListingFields,
  pendingPremiumListingFields,
} from "@/config/plans"
import { carMakes, carModels } from "@/lib/vehicle-options"

const imageBucket = "listing-images"
const maxImageWidth = 1800
const maxImageHeight = 1350
const imageQuality = 0.78

const draftIndexKey = "autodeal-listing-drafts"

type SavedListingDraft = {
  id: string
  plan: string
  category: string
  make: string
  model: string
  title: string
  updatedAt: string
  imagesCount: number
  fields: Record<string, string>
}

const categories = [
  { label: "Car", value: "cars" },
  { label: "Motorcycle", value: "motorcycles" },
  { label: "Commercial", value: "commercial" },
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

const motorcycleModels: Record<string, string[]> = {
  Yamaha: ["MT-07", "MT-09", "R1", "R6", "Tracer 7", "Tracer 9", "TMAX", "Other"],
  Honda: ["CB125F", "CB500F", "CB650R", "CBR500R", "Africa Twin", "Gold Wing", "Other"],
  Kawasaki: ["Ninja 400", "Ninja 650", "Z650", "Z900", "Versys", "Other"],
  Suzuki: ["GSX-R", "SV650", "V-Strom", "Burgman", "Other"],
  BMW: ["G 310", "F 750 GS", "F 850 GS", "R 1250 GS", "S 1000 RR", "Other"],
  Ducati: ["Monster", "Panigale", "Multistrada", "Scrambler", "Other"],
  KTM: ["Duke", "Adventure", "EXC", "SX", "Other"],
  Triumph: ["Street Triple", "Speed Triple", "Tiger", "Bonneville", "Other"],
}

const commercialModels: Record<string, string[]> = {
  Ford: ["Transit", "Transit Custom", "Ranger", "Connect", "Other"],
  Volkswagen: ["Caddy", "Transporter", "Crafter", "Amarok", "Other"],
  "Mercedes-Benz": ["Vito", "Sprinter", "Citan", "Other"],
  Renault: ["Kangoo", "Trafic", "Master", "Other"],
  Peugeot: ["Partner", "Expert", "Boxer", "Other"],
  Citroen: ["Berlingo", "Dispatch", "Relay", "Other"],
  Fiat: ["Doblo", "Ducato", "Scudo", "Other"],
  Opel: ["Combo", "Vivaro", "Movano", "Other"],
}

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric", "Other"]
const motorcycleFuelOptions = ["Petrol", "Electric", "Other"]
const transmissionOptions = ["Manual", "Automatic"]
const carBodyTypes = ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible", "MPV", "Van"]
const motorcycleBodyTypes = ["Scooter", "Naked", "Sport", "Touring", "Cruiser", "Adventure", "Moped", "Other"]
const commercialBodyTypes = ["Van", "Pickup", "Truck", "Tipper", "Box Body", "Minibus", "Other"]
const colorOptions = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Gold", "Other"]
const doorOptions = ["2", "3", "4", "5"]
const seatOptions = ["1", "2", "4", "5", "6", "7", "8+"]
const registrationCountries = ["Ireland", "UK", "Northern Ireland", "Other"]
const sellerTypes = ["Private Seller", "Dealership"]
const premiumEquipmentOptions = [
  "Leather seats",
  "Heated seats",
  "Ventilated seats",
  "Electric seats",
  "Memory seats",
  "Panoramic roof",
  "Sunroof",
  "Navigation",
  "Apple CarPlay",
  "Android Auto",
  "Bluetooth",
  "Reversing camera",
  "360 camera",
  "Parking sensors",
  "Adaptive cruise control",
  "Lane assist",
  "Blind spot monitor",
  "Keyless entry",
  "Keyless start",
  "LED headlights",
  "Xenon headlights",
  "Alloy wheels",
  "Tow bar",
  "Service history",
]
const counties = [
  "Co. Antrim", "Co. Armagh", "Co. Carlow", "Co. Cavan", "Co. Clare",
  "Co. Cork", "Co. Derry", "Co. Donegal", "Co. Down", "Co. Dublin",
  "Co. Fermanagh", "Co. Galway", "Co. Kerry", "Co. Kildare", "Co. Kilkenny",
  "Co. Laois", "Co. Leitrim", "Co. Limerick", "Co. Longford", "Co. Louth",
  "Co. Mayo", "Co. Meath", "Co. Monaghan", "Co. Offaly", "Co. Roscommon",
  "Co. Sligo", "Co. Tipperary", "Co. Tyrone", "Co. Waterford",
  "Co. Westmeath", "Co. Wexford", "Co. Wicklow",
]

export default function SellNewPage() {
  return (
    <Suspense fallback={<SellNewLoading />}>
      <SellNewContent />
    </Suspense>
  )
}

function SellNewLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-56 rounded-lg bg-slate-200" />
        <div className="mt-6 h-96 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </main>
  )
}

function SellNewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)

  const plan = searchParams.get("plan") || "free"
  const isPremiumPlan = plan === "premium"
  const maxPhotos = isPremiumPlan ? PREMIUM_BOOST.photoLimit : FREE_PLAN.photoLimit
  useEffect(() => {
    async function requireSignedInUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
      }
    }

    requireSignedInUser()
  }, [router])

  const [category, setCategory] = useState("cars")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [fuel, setFuel] = useState("")
  const [tradeInterested, setTradeInterested] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadBoxOpen, setUploadBoxOpen] = useState(false)
  const [uploadStep, setUploadStep] = useState("")
  const [uploadDetail, setUploadDetail] = useState("")
  const [uploadPercent, setUploadPercent] = useState(0)
  const [successListingId, setSuccessListingId] = useState<string | null>(null)
  const [pendingPayment, setPendingPayment] = useState(false)
  const [creditsBalance, setCreditsBalance] = useState(0)

  const [draftId, setDraftId] = useState("")
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState("")
  const [restoredDraftPhotosCount, setRestoredDraftPhotosCount] = useState(0)

  const isMotorcycle = category === "motorcycles"
  const isCommercial = category === "commercial"
  const isElectricFuel = fuel === "Electric"
  const isHybridFuel = fuel === "Hybrid" || fuel === "Plug-in Hybrid"
  const showElectricFields = !isMotorcycle && (isElectricFuel || isHybridFuel)

  const makeOptions = isMotorcycle
    ? motorcycleMakes
    : isCommercial
      ? commercialMakes
      : carMakes

  const modelOptions = useMemo(() => {
    if (!make) return []

    const source = isMotorcycle
      ? motorcycleModels
      : isCommercial
        ? commercialModels
        : carModels

    return source[make] || ["Other"]
  }, [make, isMotorcycle, isCommercial])

  const bodyTypeOptions = isMotorcycle
    ? motorcycleBodyTypes
    : isCommercial
      ? commercialBodyTypes
      : carBodyTypes

  const currentFuelOptions = isMotorcycle ? motorcycleFuelOptions : fuelOptions

  useEffect(() => {
    const requestedDraftId = searchParams.get("draft")
    const currentDraftId = requestedDraftId || crypto.randomUUID()

    setDraftId(currentDraftId)

    if (!requestedDraftId) {
      setDraftLoaded(true)
      return
    }

    const saved = localStorage.getItem(draftKey(requestedDraftId))

    if (!saved) {
      setDraftLoaded(true)
      return
    }

    try {
      const draft = JSON.parse(saved) as SavedListingDraft

      setCategory(draft.category || "cars")
      setMake(draft.make || "")
      setModel(draft.model || "")
      setFuel(String(draft.fields?.fuel || ""))
      setTradeInterested(String(draft.fields?.trade_interest || "") === "yes")
      setRestoredDraftPhotosCount(draft.imagesCount || 0)

      setTimeout(() => {
        if (!formRef.current) return

        Object.entries(draft.fields || {}).forEach(([name, value]) => {
          const field = formRef.current?.elements.namedItem(name)

          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) {
            field.value = value
          }
        })

        setDraftSavedAt(formatDraftTime(draft.updatedAt))
        setDraftLoaded(true)
      }, 120)
    } catch {
      setDraftLoaded(true)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadCredits() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const {
        data: { session },
      } = await supabase.auth.getSession()

      await fetch("/api/account-sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      }).catch(() => null)

      const { data } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", user.id)
        .maybeSingle()

      setCreditsBalance(Number(data?.credits_balance || 0))
    }

    loadCredits()
  }, [])

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [images])

  useEffect(() => {
    if (!draftLoaded) return
    scheduleDraftSave()
  }, [category, make, model, fuel, tradeInterested, images.length, draftLoaded])

  useEffect(() => {
    if (!currentFuelOptions.includes(fuel)) {
      setFuel("")
    }
  }, [currentFuelOptions, fuel])

  useEffect(() => {
    const saveBeforeClose = () => saveDraftNow()

    window.addEventListener("beforeunload", saveBeforeClose)

    return () => {
      saveBeforeClose()
      window.removeEventListener("beforeunload", saveBeforeClose)
    }
  }, [draftId, draftLoaded, category, make, model, images.length])

  function handleFiles(files: FileList | null) {
    setImages(Array.from(files || []).slice(0, maxPhotos))
    setRestoredDraftPhotosCount(0)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    setMake("")
    setModel("")
    setFuel("")
  }

  function handleMakeChange(value: string) {
    setMake(value)
    setModel("")
  }

  function saveDraftNow() {
    if (submittedRef.current || !draftId || !draftLoaded || loading || !formRef.current) return

    const formData = new FormData(formRef.current)
    const fields: Record<string, string> = {}

    formData.forEach((value, key) => {
      if (typeof value === "string") {
        fields[key] = value
      }
    })

    const title = fields.title || `${make} ${model}`.trim()
    const hasContent =
      Boolean(category && category !== "cars") ||
      Boolean(make) ||
      Boolean(model) ||
      Object.values(fields).some((value) => value.trim() !== "") ||
      images.length > 0

    if (!hasContent) return

    const updatedAt = new Date().toISOString()

    saveDraftToStorage({
      id: draftId,
      plan,
      category,
      make,
      model,
      title: title || "Untitled draft",
      updatedAt,
      imagesCount: images.length || restoredDraftPhotosCount,
      fields,
    })

    setDraftSavedAt(formatDraftTime(updatedAt))
  }

  function scheduleDraftSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveDraftNow()
    }, 500)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    setSuccessListingId(null)
    setPendingPayment(false)
    setUploadBoxOpen(true)
    setUploadStep("Preparing listing")
    setUploadDetail("Checking your account and listing details...")
    setUploadPercent(3)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        setUploadBoxOpen(false)
        router.push("/login")
        return
      }

      const filesToUpload = images.slice(0, maxPhotos)
      const compressedImages: File[] = []
      const uploadedImageUrls: string[] = []

      if (filesToUpload.length > 0) {
        setUploadStep("Optimising photos")
        setUploadDetail("Reducing photo size while keeping good quality...")
        setUploadPercent(8)

        for (let i = 0; i < filesToUpload.length; i++) {
          setUploadDetail(`Optimising photo ${i + 1} of ${filesToUpload.length}`)

          const compressed = await compressImage(filesToUpload[i])
          compressedImages.push(compressed)

          setUploadPercent(8 + Math.round(((i + 1) / filesToUpload.length) * 32))
        }

        setUploadStep("Uploading photos")
        setUploadDetail("Sending photos to AutoDeal.ie...")
        setUploadPercent(42)

        for (let i = 0; i < compressedImages.length; i++) {
          const image = compressedImages[i]
          const fileName = `${user.id}/${crypto.randomUUID()}-${cleanFileName(image.name)}`

          const { error: uploadError } = await supabase.storage
            .from(imageBucket)
            .upload(fileName, image, {
              cacheControl: "3600",
              contentType: image.type,
              upsert: false,
            })

          if (uploadError) {
            throw new Error(uploadError.message)
          }

          const { data } = supabase.storage.from(imageBucket).getPublicUrl(fileName)
          uploadedImageUrls.push(data.publicUrl)

          setUploadDetail(`Uploaded photo ${i + 1} of ${compressedImages.length}`)
          setUploadPercent(42 + Math.round(((i + 1) / compressedImages.length) * 43))
        }
      }

      setUploadStep("Publishing listing")
      setUploadDetail("Saving listing details...")
      setUploadPercent(90)

      const contactPhone = String(formData.get("contact_phone") || "").trim()
      const contactEmail = String(formData.get("contact_email") || user.email || "").trim()
      const selectedEquipment = formData
        .getAll("equipment")
        .map((item) => String(item || "").trim())
        .filter(Boolean)
      const electricInfo = getElectricVehicleInfo(formData, fuel)
      const tradeInfo = getTradeInfo(formData)
      const description = buildListingDescription(
        String(formData.get("description") || "").trim(),
        selectedEquipment,
        electricInfo,
        tradeInfo
      )

      const listingPlanFields = isPremiumPlan
        ? pendingPremiumListingFields()
        : freeListingFields()

      const payload = {
        user_id: user.id,
        category,
        vehicle_type: category,
        ...listingPlanFields,

        title: String(formData.get("title") || "").trim(),
        price: toNumber(formData.get("price")),
        brand: make,
        model,
        year: toNumber(formData.get("year")),
        mileage: toNumber(formData.get("mileage")),

        fuel,
        transmission: String(formData.get("transmission") || ""),
        body_type: String(formData.get("body_type") || ""),
        color: String(formData.get("color") || ""),

        engine_size: isElectricFuel ? null : emptyToNull(formData.get("engine_size")),
        engine_power: emptyToNull(formData.get("engine_power")),

        doors: isMotorcycle ? null : emptyToNull(formData.get("doors")),
        seats: isMotorcycle ? null : emptyToNull(formData.get("seats")),

        registration_country: String(formData.get("registration_country") || ""),
        previous_owners: emptyToNull(formData.get("previous_owners")),
        vin: String(formData.get("vin") || "").trim(),

        nct_expiry: isMotorcycle ? null : emptyToNull(formData.get("nct_expiry")),
        tax_expiry: isMotorcycle ? null : emptyToNull(formData.get("tax_expiry")),
        annual_tax: isMotorcycle ? null : emptyToNull(formData.get("annual_tax")),

        location: String(formData.get("location") || ""),
        seller_type: String(formData.get("seller_type") || ""),

        phone: contactPhone,
        contact_phone: contactPhone,
        email: contactEmail,
        contact_email: contactEmail,

        description,
        images: uploadedImageUrls,
        featured_image_url: uploadedImageUrls[0] || null,
      }

      const { data: listing, error: insertError } = await supabase
        .from("listings")
        .insert(payload)
        .select("id")
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      async function refreshPublicListings() {
        await fetch("/api/revalidate-listings", {
          method: "POST",
        }).catch(() => null)
      }

      submittedRef.current = true
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      setDraftSavedAt("")
      removeSubmittedDrafts(draftId, String(formData.get("title") || "").trim(), make, model)

      if (isPremiumPlan) {
        const wantsToUseCredit =
          creditsBalance >= PREMIUM_BOOST.creditsRequired &&
          window.confirm("Use 1 credit to create this Premium paid listing?")

        if (wantsToUseCredit) {
          const { error: creditError } = await supabase.rpc(
            "spend_user_credit_for_listing",
            {
              p_user_id: user.id,
              p_listing_id: listing.id,
            }
          )

          if (creditError) {
            throw new Error(creditError.message)
          }

          await refreshPublicListings()

          setUploadStep("Done")
          setUploadDetail("Your Premium listing has been published successfully.")
          setUploadPercent(100)

          setTimeout(() => {
            setUploadBoxOpen(false)
            setSuccessListingId(listing.id)
            setLoading(false)
          }, 700)

          return
        }

        setUploadStep("Opening payment")
        setUploadDetail("Taking you to Stripe checkout...")
        setUploadPercent(100)
        setPendingPayment(true)

        const { data: sessionData } = await supabase.auth.getSession()

        const checkoutResponse = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token || ""}`,
          },
          body: JSON.stringify({
            type: "premium_boost",
            plan_key: PREMIUM_BOOST.key,
            listing_id: listing.id,
          }),
        })

        const checkout = await checkoutResponse.json()

        if (!checkoutResponse.ok || !checkout.url) {
          throw new Error(checkout.error || "Could not start Stripe checkout.")
        }

        window.location.href = checkout.url
        return
      }

      await refreshPublicListings()

      setUploadStep("Done")
      setUploadDetail("Your listing has been published successfully.")
      setUploadPercent(100)

      setTimeout(() => {
        setUploadBoxOpen(false)
        setSuccessListingId(listing.id)
        setLoading(false)
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setUploadBoxOpen(false)
      setLoading(false)
      setPendingPayment(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {isPremiumPlan ? "Premium" : "Free plan"}
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Create New Listing
            </h1>
            <p className="mt-2 text-slate-600">
              {isPremiumPlan
                ? "Create a Premium paid listing with priority search, homepage visibility and more photos."
                : "Fill in the vehicle details below to publish your ad."}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              {images.length}/{maxPhotos} images included
            </div>

            {isPremiumPlan && (
              <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
                Credits available: {creditsBalance}
              </div>
            )}
          </div>
        </div>

        {draftSavedAt && (
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Draft saved at {draftSavedAt}
            {restoredDraftPhotosCount > 0 && images.length === 0
              ? ` - ${restoredDraftPhotosCount} photos were in this draft, please select them again before publishing.`
              : ""}
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onInput={scheduleDraftSave}
          onChange={scheduleDraftSave}
          className="space-y-8"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <Card title="Vehicle Details">
            <div className="grid gap-5 md:grid-cols-3">
              <ControlledSelect
                label="Category"
                value={category}
                onChange={handleCategoryChange}
                options={categories}
                required
              />

              <ControlledSelect
                label="Make"
                value={make}
                onChange={handleMakeChange}
                options={makeOptions.map((item) => ({ label: item, value: item }))}
                required
              />

              <ControlledSelect
                label="Model"
                value={model}
                onChange={setModel}
                options={modelOptions.map((item) => ({ label: item, value: item }))}
                required
                disabled={!make}
              />

              <Field label="Year" name="year" type="number" placeholder="2020" required />

              <Select
                label={isMotorcycle ? "Bike Type" : "Body Type"}
                name="body_type"
                options={bodyTypeOptions}
              />

              <Select label="Color" name="color" options={colorOptions} />
              <Select label="Transmission" name="transmission" options={transmissionOptions} required />
              <ControlledSelect
                label="Fuel Type"
                name="fuel"
                value={fuel}
                onChange={setFuel}
                options={currentFuelOptions.map((item) => ({ label: item, value: item }))}
                required
              />
              {!isElectricFuel && (
                <Field label="Engine Size (L)" name="engine_size" placeholder={isMotorcycle ? "e.g. 0.7" : "e.g. 2.0"} />
              )}
              <Field label={isElectricFuel ? "Motor Power (hp)" : "Engine Power (hp)"} name="engine_power" placeholder={isElectricFuel ? "e.g. 204" : "e.g. 150"} />
              <Field label="Mileage (km)" name="mileage" type="number" required />

              {!isMotorcycle && (
                <>
                  <Select label="Doors" name="doors" options={doorOptions} />
                  <Select label="Seats" name="seats" options={seatOptions} />
                </>
              )}
            </div>
          </Card>

          {showElectricFields && (
            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm shadow-sky-100">
              <div className="mb-5">
                <p className="text-sm font-black uppercase tracking-wide text-sky-700">
                  {isElectricFuel ? "Electric vehicle" : "Hybrid vehicle"}
                </p>
                <h2 className="text-xl font-black text-sky-950">
                  Electric information
                </h2>
                <p className="mt-1 text-sm font-semibold text-sky-800">
                  Add battery, range, and charging details for buyers.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Battery capacity (kWh)" name="battery_capacity" type="number" placeholder="e.g. 75" />
                <Field label="Electric range (km)" name="electric_range" type="number" placeholder="e.g. 420" />
                <Field label="Charging speed (kW)" name="charging_speed" type="number" placeholder="e.g. 150" />
                <Field label="Battery health (%)" name="battery_health" type="number" placeholder="e.g. 92" />
                <Select label="Charging port" name="charging_port" options={["Type 2", "CCS", "CHAdeMO", "Tesla", "Other"]} />
                {isHybridFuel && (
                  <Field label="EV-only range (km)" name="ev_only_range" type="number" placeholder="e.g. 50" />
                )}
              </div>
            </section>
          )}

          <Card title="Basic Information">
            <div className="grid gap-5">
              <Field
                label="Ad Title"
                name="title"
                placeholder={isMotorcycle ? "e.g. 2021 Yamaha MT-07" : "e.g. 2020 BMW 5 Series M-Sport"}
                required
              />

              <Field label="Price (EUR)" name="price" type="number" required />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">
                  Description <Required />
                </span>
                <textarea
                  name="description"
                  rows={6}
                  required
                  placeholder="Describe your vehicle in detail..."
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            </div>
          </Card>

          <Card title="Trade / Exchange">
            <div className="grid gap-5">
              <ControlledSelect
                label="Interested in trade?"
                name="trade_interest"
                value={tradeInterested ? "yes" : "no"}
                onChange={(value) => setTradeInterested(value === "yes")}
                options={[
                  { label: "No", value: "no" },
                  { label: "Yes", value: "yes" },
                ]}
              />

              {tradeInterested && (
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    What would you trade for?
                  </span>
                  <textarea
                    name="trade_details"
                    rows={4}
                    placeholder="Example: Interested in a cheaper diesel car, automatic SUV, van, or cash either way."
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
              )}
            </div>
          </Card>

          {isPremiumPlan && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm shadow-emerald-100">
              <div className="mb-5 flex flex-col gap-1">
                <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                  Premium extra
                </p>
                <h2 className="text-xl font-black text-emerald-950">
                  Vehicle equipment
                </h2>
                <p className="text-sm font-semibold text-emerald-800">
                  Select the extra equipment included with this Premium listing.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {premiumEquipmentOptions.map((item) => (
                  <label
                    key={item}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-400"
                  >
                    <input
                      type="checkbox"
                      name="equipment"
                      value={item}
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <Card title="Registration & History">
            <div className="grid gap-5 md:grid-cols-3">
              <Select
                label="Current Registration"
                name="registration_country"
                options={registrationCountries}
                required
              />
              <Field label="Previous Owners" name="previous_owners" placeholder="e.g. 2" />
              <Field label="VIN (Optional)" name="vin" placeholder="Vehicle Identification Number" />

              {!isMotorcycle && (
                <>
                  <Field label="NCT Expiry Date" name="nct_expiry" type="date" />
                  <Field label="Tax Expiry Date" name="tax_expiry" type="date" />
                  <Field label="Annual Tax (EUR)" name="annual_tax" placeholder="e.g. 280" />
                </>
              )}
            </div>
          </Card>

          <Card title="Location & Contact">
            <div className="grid gap-5 md:grid-cols-2">
              <Select label="Location (County)" name="location" options={counties} required />
              <Select label="Seller Type" name="seller_type" options={sellerTypes} required />
              <Field label="Phone Number" name="contact_phone" placeholder="e.g. 087 123 4567" required />
              <Field label="Email Address" name="contact_email" type="email" placeholder="you@email.com" />
            </div>
          </Card>

          <Card title="Photos" aside={`${images.length}/${maxPhotos} images`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => handleFiles(event.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                handleFiles(event.dataTransfer.files)
              }}
              className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-4 text-center hover:bg-blue-50"
            >
              <span className="text-lg font-bold text-slate-800">
                Click to Upload or Drag Photos
              </span>
              <span className="mt-1 text-sm text-slate-500">
                JPG, PNG, WEBP allowed. Photos will be optimised before upload.
              </span>
            </button>

            {previewUrls.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3 md:grid-cols-5">
                {previewUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={url}
                      alt="Selected vehicle"
                      className="h-32 w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? pendingPayment
                ? "Opening checkout..."
                : "Publishing..."
              : isPremiumPlan
                ? "Publish Premium Listing"
                : "Publish Listing"}
          </button>
        </form>
      </section>

      {uploadBoxOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Please wait
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              {uploadStep || "Uploading listing"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {uploadDetail || "Your listing is being prepared."}
            </p>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Progress</span>
              <span className="font-bold text-blue-700">{uploadPercent}%</span>
            </div>

            <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Large photos are automatically reduced before upload, so the site
              stays faster while keeping good image quality.
            </p>
          </div>
        </div>
      )}

      {successListingId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-black text-green-700">
              OK
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-950">
              Listing Published
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your listing was uploaded successfully. You can now view it or
              return to your account dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push(`/cars/${successListingId}`)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                View Listing
              </button>

              <button
                type="button"
                onClick={() => router.push("/account")}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Go to Account
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function draftKey(id: string) {
  return `autodeal-listing-draft-${id}`
}

function readDraftIndex() {
  try {
    return JSON.parse(localStorage.getItem(draftIndexKey) || "[]") as string[]
  } catch {
    return []
  }
}

function saveDraftToStorage(draft: SavedListingDraft) {
  localStorage.setItem(draftKey(draft.id), JSON.stringify(draft))

  const index = readDraftIndex().filter((id) => id !== draft.id)
  localStorage.setItem(draftIndexKey, JSON.stringify([draft.id, ...index]))
}

function removeDraftFromStorage(id: string) {
  if (!id) return

  localStorage.removeItem(draftKey(id))
  localStorage.setItem(
    draftIndexKey,
    JSON.stringify(readDraftIndex().filter((item) => item !== id))
  )
}

function removeSubmittedDrafts(
  currentDraftId: string,
  submittedTitle: string,
  submittedMake: string,
  submittedModel: string
) {
  const title = submittedTitle.trim().toLowerCase()
  const makeValue = submittedMake.trim().toLowerCase()
  const modelValue = submittedModel.trim().toLowerCase()
  const idsToKeep: string[] = []

  readDraftIndex().forEach((id) => {
    const saved = localStorage.getItem(draftKey(id))

    if (!saved) return

    let shouldRemove = id === currentDraftId

    try {
      const draft = JSON.parse(saved) as SavedListingDraft
      const draftTitle = String(draft.title || "").trim().toLowerCase()
      const draftMake = String(draft.make || "").trim().toLowerCase()
      const draftModel = String(draft.model || "").trim().toLowerCase()

      shouldRemove =
        shouldRemove ||
        (Boolean(title) && draftTitle === title) ||
        (Boolean(makeValue) &&
          Boolean(modelValue) &&
          draftMake === makeValue &&
          draftModel === modelValue)
    } catch {}

    if (shouldRemove) {
      localStorage.removeItem(draftKey(id))
    } else {
      idsToKeep.push(id)
    }
  })

  localStorage.setItem(draftIndexKey, JSON.stringify(idsToKeep))
}
function formatDraftTime(date: string) {
  return new Intl.DateTimeFormat("en-IE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)

    const scale = Math.min(
      maxImageWidth / image.width,
      maxImageHeight / image.height,
      1
    )

    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", imageQuality)
    })

    if (!blob) return file

    const compressedFile = new File([blob], `${removeExtension(file.name)}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    })

    return compressedFile.size < file.size ? compressedFile : file
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function removeExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "")
}

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
}

type ElectricInfo = {
  fuel: string
  batteryCapacity: string
  electricRange: string
  chargingSpeed: string
  batteryHealth: string
  chargingPort: string
  evOnlyRange: string
}

type TradeInfo = {
  interested: boolean
  details: string
}

function buildListingDescription(
  description: string,
  equipment: string[],
  electricInfo: ElectricInfo | null,
  tradeInfo: TradeInfo | null
) {
  const sections = [description]

  if (electricInfo) {
    const rows = [
      electricInfo.fuel ? `Fuel type: ${electricInfo.fuel}` : "",
      electricInfo.batteryCapacity ? `Battery capacity: ${electricInfo.batteryCapacity} kWh` : "",
      electricInfo.electricRange ? `Electric range: ${electricInfo.electricRange} km` : "",
      electricInfo.evOnlyRange ? `EV-only range: ${electricInfo.evOnlyRange} km` : "",
      electricInfo.chargingSpeed ? `Charging speed: ${electricInfo.chargingSpeed} kW` : "",
      electricInfo.batteryHealth ? `Battery health: ${electricInfo.batteryHealth}%` : "",
      electricInfo.chargingPort ? `Charging port: ${electricInfo.chargingPort}` : "",
    ].filter(Boolean)

    if (rows.length > 0) {
      sections.push(["Electric vehicle information:", ...rows.map((item) => `- ${item}`)].join("\n"))
    }
  }

  if (equipment.length > 0) {
    sections.push([
      "Premium equipment:",
      ...equipment.map((item) => `- ${item}`),
    ].join("\n"))
  }

  if (tradeInfo?.interested) {
    const tradeLines = ["Trade / exchange interest:"]

    if (tradeInfo.details) {
      tradeLines.push(`- ${tradeInfo.details}`)
    } else {
      tradeLines.push("- Open to trade offers")
    }

    sections.push(tradeLines.join("\n"))
  }

  return sections.filter(Boolean).join("\n\n")
}

function getTradeInfo(formData: FormData): TradeInfo | null {
  const interested = String(formData.get("trade_interest") || "") === "yes"
  if (!interested) return null

  return {
    interested,
    details: String(formData.get("trade_details") || "").trim(),
  }
}

function getElectricVehicleInfo(formData: FormData, fuel: string): ElectricInfo | null {
  const isElectric = fuel === "Electric"
  const isHybrid = fuel === "Hybrid" || fuel === "Plug-in Hybrid"

  if (!isElectric && !isHybrid) return null

  return {
    fuel,
    batteryCapacity: String(formData.get("battery_capacity") || "").trim(),
    electricRange: String(formData.get("electric_range") || "").trim(),
    chargingSpeed: String(formData.get("charging_speed") || "").trim(),
    batteryHealth: String(formData.get("battery_health") || "").trim(),
    chargingPort: String(formData.get("charging_port") || "").trim(),
    evOnlyRange: String(formData.get("ev_only_range") || "").trim(),
  }
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value || "").trim()
  return text === "" ? null : text
}

function toNumber(value: FormDataEntryValue | null) {
  const text = String(value || "").trim()
  return text === "" ? null : Number(text)
}

function Card({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {aside && <p className="text-sm font-bold text-slate-500">{aside}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">
        {label} {required && <Required />}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
  required = false,
}: {
  label: string
  name: string
  options: string[]
  required?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">
        {label} {required && <Required />}
      </span>
      <select
        name={name}
        required={required}
        className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function ControlledSelect({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: {
  label: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">
        {label} {required && <Required />}
      </span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Required() {
  return <span className="text-red-500">*</span>
}





