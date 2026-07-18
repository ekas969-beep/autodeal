"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

const imageBucket = "listing-images"
const maxPhotos = 30
const maxImageWidth = 1600
const maxImageHeight = 1200
const imageQuality = 0.82
const adminEmail = "ekas969@gmail.com"

const categories = [
  { label: "Car", value: "cars" },
  { label: "Motorcycle", value: "motorcycles" },
  { label: "Commercial", value: "commercial" },
]

const fuelOptions = ["Petrol", "Diesel", "Hybrid", "Electric", "Other"]
const transmissionOptions = ["Manual", "Automatic"]
const bodyTypes = [
  "Hatchback",
  "Saloon",
  "Estate",
  "SUV",
  "Coupe",
  "Convertible",
  "MPV",
  "Van",
  "Scooter",
  "Naked",
  "Sport",
  "Touring",
  "Pickup",
  "Truck",
  "Other",
]
const colors = [
  "Black",
  "White",
  "Silver",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Brown",
  "Gold",
  "Other",
]
const doorsOptions = ["2", "3", "4", "5"]
const seatsOptions = ["1", "2", "4", "5", "6", "7", "8+"]
const registrationCountries = ["Ireland", "UK", "Northern Ireland", "Other"]
const sellerTypes = ["Private Seller", "Dealership"]
const counties = [
  "Co. Antrim",
  "Co. Armagh",
  "Co. Carlow",
  "Co. Cavan",
  "Co. Clare",
  "Co. Cork",
  "Co. Derry",
  "Co. Donegal",
  "Co. Down",
  "Co. Dublin",
  "Co. Fermanagh",
  "Co. Galway",
  "Co. Kerry",
  "Co. Kildare",
  "Co. Kilkenny",
  "Co. Laois",
  "Co. Leitrim",
  "Co. Limerick",
  "Co. Longford",
  "Co. Louth",
  "Co. Mayo",
  "Co. Meath",
  "Co. Monaghan",
  "Co. Offaly",
  "Co. Roscommon",
  "Co. Sligo",
  "Co. Tipperary",
  "Co. Tyrone",
  "Co. Waterford",
  "Co. Westmeath",
  "Co. Wexford",
  "Co. Wicklow",
]

type ListingForm = {
  title: string
  price: string
  category: string
  brand: string
  model: string
  year: string
  mileage: string
  fuel: string
  transmission: string
  body_type: string
  color: string
  engine_size: string
  engine_power: string
  doors: string
  seats: string
  registration_country: string
  previous_owners: string
  vin: string
  nct_expiry: string
  tax_expiry: string
  annual_tax: string
  location: string
  seller_type: string
  contact_phone: string
  contact_email: string
  description: string
}

const emptyForm: ListingForm = {
  title: "",
  price: "",
  category: "cars",
  brand: "",
  model: "",
  year: "",
  mileage: "",
  fuel: "",
  transmission: "",
  body_type: "",
  color: "",
  engine_size: "",
  engine_power: "",
  doors: "",
  seats: "",
  registration_country: "",
  previous_owners: "",
  vin: "",
  nct_expiry: "",
  tax_expiry: "",
  annual_tax: "",
  location: "",
  seller_type: "",
  contact_phone: "",
  contact_email: "",
  description: "",
}

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const premiumCreditUpgrade = searchParams.get("upgrade") === "premium-credit"

  const [form, setForm] = useState<ListingForm>(emptyForm)
  const [images, setImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([])
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saveBoxOpen, setSaveBoxOpen] = useState(false)
  const [saveStep, setSaveStep] = useState("")
  const [saveDetail, setSaveDetail] = useState("")
  const [savePercent, setSavePercent] = useState(0)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const goTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }

    goTop()
    const timer = setTimeout(goTop, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function loadListing() {
      setLoading(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (error || !data) {
        setError("Listing not found or you do not have permission to edit it.")
        setLoading(false)
        return
      }

      setImages(Array.isArray(data.images) ? data.images : [])

      setForm({
        title: text(data.title),
        price: text(data.price),
        category: text(data.category || data.vehicle_type || "cars"),
        brand: text(data.brand),
        model: text(data.model),
        year: text(data.year),
        mileage: text(data.mileage),
        fuel: text(data.fuel),
        transmission: text(data.transmission),
        body_type: text(data.body_type),
        color: text(data.color),
        engine_size: text(data.engine_size),
        engine_power: text(data.engine_power),
        doors: text(data.doors),
        seats: text(data.seats),
        registration_country: text(data.registration_country),
        previous_owners: text(data.previous_owners),
        vin: text(data.vin),
        nct_expiry: dateValue(data.nct_expiry),
        tax_expiry: dateValue(data.tax_expiry),
        annual_tax: text(data.annual_tax),
        location: text(data.location),
        seller_type: text(data.seller_type),
        contact_phone: text(data.contact_phone || data.phone),
        contact_email: cleanAdminEmail(data.contact_email || data.email),
        description: text(data.description),
      })

      setLoading(false)
    }

    if (id) loadListing()
  }, [id, router])

  useEffect(() => {
    const urls = newImages.map((image) => URL.createObjectURL(image))
    setNewPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [newImages])

  function updateField(name: keyof ListingForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleNewFiles(files: FileList | null) {
    const selectedFiles = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/")
    )

    if (selectedFiles.length === 0) return

    setNewImages((current) => {
      const availableSlots = Math.max(0, maxPhotos - images.length - current.length)
      return [...current, ...selectedFiles.slice(0, availableSlots)]
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function removeExistingImage(index: number) {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function removeNewImage(index: number) {
    setNewImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function makeExistingMain(index: number) {
    setImages((current) => moveItemToStart(current, index))
  }

  function makeNewMain(index: number) {
    setNewImages((current) => moveItemToStart(current, index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setError("")
    setSuccessModalOpen(false)
    setSaveBoxOpen(true)
    setSaveStep("Preparing changes")
    setSaveDetail("Checking your updated listing details...")
    setSavePercent(15)

    await wait(250)

    const isMotorcycle = form.category === "motorcycles"
    const uploadedImageUrls: string[] = []

    if (newImages.length > 0) {
      setSaveStep("Uploading photos")
      setSaveDetail(`Uploading ${newImages.length} new photo${newImages.length === 1 ? "" : "s"}...`)
      setSavePercent(30)

      for (let i = 0; i < newImages.length; i++) {
        try {
          const image = await compressImage(newImages[i])
          const fileName = `${userId}/${crypto.randomUUID()}-${cleanFileName(image.name)}`

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

          setSaveDetail(`Uploaded photo ${i + 1} of ${newImages.length}`)
          setSavePercent(30 + Math.round(((i + 1) / newImages.length) * 20))
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : "Could not upload photos.")
          setSaving(false)
          setSaveBoxOpen(false)
          return
        }
      }
    }

    const nextImages = [...images, ...uploadedImageUrls].slice(0, maxPhotos)

    const payload = {
      title: form.title.trim(),
      price: toNumber(form.price),
      category: form.category,
      vehicle_type: form.category,
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: toNumber(form.year),
      mileage: toNumber(form.mileage),
      fuel: form.fuel,
      transmission: form.transmission,
      body_type: form.body_type,
      color: form.color,
      engine_size: emptyToNull(form.engine_size),
      engine_power: emptyToNull(form.engine_power),
      doors: isMotorcycle ? null : emptyToNull(form.doors),
      seats: isMotorcycle ? null : emptyToNull(form.seats),
      registration_country: form.registration_country,
      previous_owners: emptyToNull(form.previous_owners),
      vin: form.vin.trim(),
      nct_expiry: isMotorcycle ? null : emptyToNull(form.nct_expiry),
      tax_expiry: isMotorcycle ? null : emptyToNull(form.tax_expiry),
      annual_tax: isMotorcycle ? null : emptyToNull(form.annual_tax),
      location: form.location,
      seller_type: form.seller_type,
      phone: form.contact_phone.trim(),
      contact_phone: form.contact_phone.trim(),
      email: cleanAdminEmail(form.contact_email),
      contact_email: cleanAdminEmail(form.contact_email),
      description: form.description.trim(),
      images: nextImages,
      featured_image_url: nextImages[0] || null,
    }

    setSaveStep("Saving listing")
    setSaveDetail("Updating your listing on AutoDeal.ie...")
    setSavePercent(55)

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      setError(error.message)
      setSaving(false)
      setSaveBoxOpen(false)
      return
    }

    setImages(nextImages)
    setNewImages([])

    await fetch("/api/revalidate-listings", {
      method: "POST",
    }).catch(() => null)

    if (premiumCreditUpgrade) {
      setSaveStep("Applying Premium")
      setSaveDetail("Using 1 credit after your edited listing was saved...")
      setSavePercent(78)

      const { error: creditError } = await supabase.rpc(
        "spend_user_credit_for_listing",
        {
          p_user_id: userId,
          p_listing_id: id,
        }
      )

      if (creditError) {
        setError(creditError.message)
        setSaving(false)
        setSaveBoxOpen(false)
        return
      }
    }

    setSaveStep("Done")
    setSaveDetail(
      premiumCreditUpgrade
        ? "Your listing was updated and upgraded to Premium."
        : "Your listing was updated successfully."
    )
    setSavePercent(100)

    await wait(600)

    setSaveBoxOpen(false)
    setSuccessModalOpen(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-6xl">Loading listing...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/account"
              className="text-sm font-bold text-blue-700 hover:text-blue-800"
            >
              ← Back to account
            </Link>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Edit Listing
            </h1>

            <p className="mt-2 text-slate-600">
              {premiumCreditUpgrade
                ? "Update your listing details. One credit will be used only after you save the listing."
                : "Update your listing details and save the changes."}
            </p>
          </div>

          <Link
            href={`/cars/${id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            View Listing
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {premiumCreditUpgrade && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
            Premium with 1 Credit is selected. The credit will only be taken
            after you press Save Changes and the listing is saved successfully.
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Photos</h2>
              <p className="mt-1 text-sm text-slate-500">
                {images.length + newImages.length}/{maxPhotos} photos selected.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length + newImages.length >= maxPhotos}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add photos
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => handleNewFiles(event.target.files)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              handleNewFiles(event.dataTransfer.files)
            }}
            className="mb-5 flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-4 text-center hover:bg-blue-50"
          >
            <span className="text-base font-bold text-slate-800">
              Click to add or drag photos here
            </span>
            <span className="mt-1 text-sm text-slate-500">
              Remove old photos, add new ones, or set the main photo before saving.
            </span>
          </button>

          {images.length === 0 && newImages.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              No photos selected yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
              {images.map((image, index) => (
                <PhotoEditorCard
                  key={`${image}-${index}`}
                  src={image}
                  label={index === 0 ? "Main" : "Current"}
                  onMakeMain={index === 0 ? undefined : () => makeExistingMain(index)}
                  onRemove={() => removeExistingImage(index)}
                />
              ))}

              {newPreviewUrls.map((url, index) => (
                <PhotoEditorCard
                  key={`${url}-${index}`}
                  src={url}
                  label={images.length === 0 && index === 0 ? "Main" : "New"}
                  onMakeMain={
                    images.length === 0 && index !== 0
                      ? () => makeNewMain(index)
                      : undefined
                  }
                  onRemove={() => removeNewImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card title="Vehicle Details">
            <div className="grid gap-5 md:grid-cols-3">
              <Select
                label="Category"
                value={form.category}
                onChange={(value) => updateField("category", value)}
                options={categories}
                required
              />

              <Field
                label="Make"
                value={form.brand}
                onChange={(value) => updateField("brand", value)}
                required
              />
              <Field
                label="Model"
                value={form.model}
                onChange={(value) => updateField("model", value)}
                required
              />
              <Field
                label="Year"
                type="number"
                value={form.year}
                onChange={(value) => updateField("year", value)}
                required
              />

              <Select
                label={form.category === "motorcycles" ? "Bike Type" : "Body Type"}
                value={form.body_type}
                onChange={(value) => updateField("body_type", value)}
                options={bodyTypes.map((item) => ({ label: item, value: item }))}
              />

              <Select
                label="Color"
                value={form.color}
                onChange={(value) => updateField("color", value)}
                options={colors.map((item) => ({ label: item, value: item }))}
              />
              <Select
                label="Transmission"
                value={form.transmission}
                onChange={(value) => updateField("transmission", value)}
                options={transmissionOptions.map((item) => ({
                  label: item,
                  value: item,
                }))}
                required
              />
              <Select
                label="Fuel Type"
                value={form.fuel}
                onChange={(value) => updateField("fuel", value)}
                options={fuelOptions.map((item) => ({ label: item, value: item }))}
                required
              />

              <Field
                label="Engine Size (L)"
                value={form.engine_size}
                onChange={(value) => updateField("engine_size", value)}
              />
              <Field
                label="Engine Power (hp)"
                value={form.engine_power}
                onChange={(value) => updateField("engine_power", value)}
              />
              <Field
                label="Mileage (km)"
                type="number"
                value={form.mileage}
                onChange={(value) => updateField("mileage", value)}
                required
              />

              {form.category !== "motorcycles" && (
                <>
                  <Select
                    label="Doors"
                    value={form.doors}
                    onChange={(value) => updateField("doors", value)}
                    options={doorsOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                  <Select
                    label="Seats"
                    value={form.seats}
                    onChange={(value) => updateField("seats", value)}
                    options={seatsOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                </>
              )}
            </div>
          </Card>

          <Card title="Basic Information">
            <div className="grid gap-5">
              <Field
                label="Ad Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                required
              />
              <Field
                label="Price (€)"
                type="number"
                value={form.price}
                onChange={(value) => updateField("price", value)}
                required
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">
                  Description <Required />
                </span>
                <textarea
                  rows={7}
                  required
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            </div>
          </Card>

          <Card title="Registration & History">
            <div className="grid gap-5 md:grid-cols-3">
              <Select
                label="Current Registration"
                value={form.registration_country}
                onChange={(value) => updateField("registration_country", value)}
                options={registrationCountries.map((item) => ({
                  label: item,
                  value: item,
                }))}
                required
              />
              <Field
                label="Previous Owners"
                value={form.previous_owners}
                onChange={(value) => updateField("previous_owners", value)}
              />
              <Field
                label="VIN"
                value={form.vin}
                onChange={(value) => updateField("vin", value)}
              />

              {form.category !== "motorcycles" && (
                <>
                  <Field
                    label="NCT Expiry Date"
                    type="date"
                    value={form.nct_expiry}
                    onChange={(value) => updateField("nct_expiry", value)}
                  />
                  <Field
                    label="Tax Expiry Date"
                    type="date"
                    value={form.tax_expiry}
                    onChange={(value) => updateField("tax_expiry", value)}
                  />
                  <Field
                    label="Annual Tax (€)"
                    value={form.annual_tax}
                    onChange={(value) => updateField("annual_tax", value)}
                  />
                </>
              )}
            </div>
          </Card>

          <Card title="Location & Contact">
            <div className="grid gap-5 md:grid-cols-2">
              <Select
                label="Location"
                value={form.location}
                onChange={(value) => updateField("location", value)}
                options={counties.map((item) => ({ label: item, value: item }))}
                required
              />
              <Select
                label="Seller Type"
                value={form.seller_type}
                onChange={(value) => updateField("seller_type", value)}
                options={sellerTypes.map((item) => ({
                  label: item,
                  value: item,
                }))}
                required
              />
              <Field
                label="Phone Number"
                value={form.contact_phone}
                onChange={(value) => updateField("contact_phone", value)}
                required
              />
              <Field
                label="Email Address"
                type="email"
                value={form.contact_email}
                onChange={(value) => updateField("contact_email", value)}
              />
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="h-14 flex-1 rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <Link
              href="/account"
              className="flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>

      {saveBoxOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Please wait
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              {saveStep || "Saving listing"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {saveDetail || "Your listing changes are being saved."}
            </p>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${savePercent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Progress</span>
              <span className="font-bold text-blue-700">{savePercent}%</span>
            </div>

            <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
              We are updating your listing details. Please do not close this page.
            </p>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-black text-green-700">
              ✓
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-950">
              Listing Updated
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your listing changes were saved successfully. You can now view the
              updated listing or return to your account dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push(`/cars/${id}`)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                View Listing
              </button>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("autodeal-account-force-top", "1")
                  sessionStorage.removeItem("autodeal-account-return-to-scroll")
                  router.push("/account")
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Go to Account
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSuccessModalOpen(false)}
              className="mt-4 text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              Continue editing
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function PhotoEditorCard({
  src,
  label,
  onMakeMain,
  onRemove,
}: {
  src: string
  label: string
  onMakeMain?: () => void
  onRemove: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <img src={src} alt="Listing photo" className="h-36 w-full object-cover" />

      <span
        className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-bold text-white ${
          label === "Main" ? "bg-blue-600" : "bg-slate-900/75"
        }`}
      >
        {label}
      </span>

      <div className="absolute inset-x-2 bottom-2 grid gap-2">
        {onMakeMain && (
          <button
            type="button"
            onClick={onMakeMain}
            className="rounded-lg bg-white/95 px-2 py-1.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Make main
          </button>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">
        {label} {required && <Required />}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        className="h-12 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  required?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">
        {label} {required && <Required />}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
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

function text(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value)
}

function cleanAdminEmail(value: unknown) {
  const email = text(value).trim()
  return email.toLowerCase() === adminEmail ? "" : email
}

function dateValue(value: unknown) {
  if (!value) return ""
  return String(value).slice(0, 10)
}

function emptyToNull(value: string) {
  const text = String(value || "").trim()
  return text === "" ? null : text
}

function toNumber(value: string) {
  const text = String(value || "").trim()
  return text === "" ? null : Number(text)
}

function moveItemToStart<T>(items: T[], index: number) {
  if (index <= 0 || index >= items.length) return items

  const nextItems = [...items]
  const [item] = nextItems.splice(index, 1)
  return [item, ...nextItems]
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const scale = Math.min(maxImageWidth / image.width, maxImageHeight / image.height, 1)
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
