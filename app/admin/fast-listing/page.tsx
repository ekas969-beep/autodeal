"use client"

import { type FormEvent, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const adminEmail = "ekas969@gmail.com"

const counties = [
  "Co. Antrim", "Co. Armagh", "Co. Carlow", "Co. Cavan", "Co. Clare",
  "Co. Cork", "Co. Derry", "Co. Donegal", "Co. Down", "Co. Dublin",
  "Co. Fermanagh", "Co. Galway", "Co. Kerry", "Co. Kildare", "Co. Kilkenny",
  "Co. Laois", "Co. Leitrim", "Co. Limerick", "Co. Longford", "Co. Louth",
  "Co. Mayo", "Co. Meath", "Co. Monaghan", "Co. Offaly", "Co. Roscommon",
  "Co. Sligo", "Co. Tipperary", "Co. Tyrone", "Co. Waterford",
  "Co. Westmeath", "Co. Wexford", "Co. Wicklow",
]

type FastListingDraft = {
  sourceUrl: string
  title: string
  price: string
  brand: string
  model: string
  year: string
  mileage: string
  fuel: string
  transmission: string
  bodyType: string
  color: string
  location: string
  engineSize: string
  previousOwners: string
  nctExpiry: string
  doors: string
  seats: string
  contactPhone: string
  phoneNotice: string
  description: string
  images: string[]
}

type ImageQualityInfo = {
  width: number
  height: number
}

type UploadProgress = {
  stage: "photos" | "listing"
  uploaded: number
  total: number
}

const emptyDraft: FastListingDraft = {
  sourceUrl: "",
  title: "",
  price: "",
  brand: "",
  model: "",
  year: "",
  mileage: "",
  fuel: "",
  transmission: "",
  bodyType: "",
  color: "",
  location: "",
  engineSize: "",
  previousOwners: "",
  nctExpiry: "",
  doors: "",
  seats: "",
  contactPhone: "",
  phoneNotice: "",
  description: "",
  images: [],
}

function getVisibleImageGroups(
  images: string[],
  qualityByUrl: Record<string, ImageQualityInfo>,
  fingerprintByUrl: Record<string, string>
) {
  const visible: string[] = []
  const lowQuality: string[] = []
  const duplicates: string[] = []
  const urlKeys = new Set<string>()
  const fingerprints: string[] = []

  for (const image of images) {
    const quality = qualityByUrl[image]

    if (isLowResolutionImage(quality)) {
      lowQuality.push(image)
      continue
    }

    const urlKey = getImageKey(image)
    const fingerprint = fingerprintByUrl[image] || ""
    const hasVisualDuplicate =
      fingerprint &&
      fingerprints.some((existing) => getFingerprintDistance(existing, fingerprint) <= 8)

    if (urlKeys.has(urlKey) || hasVisualDuplicate) {
      duplicates.push(image)
      continue
    }

    visible.push(image)
    urlKeys.add(urlKey)
    if (fingerprint) fingerprints.push(fingerprint)
  }

  return { visible, lowQuality, duplicates }
}

export default function AdminFastListingPage() {
  const router = useRouter()
  const [sourceUrl, setSourceUrl] = useState("")
  const [draft, setDraft] = useState<FastListingDraft>(emptyDraft)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [createdId, setCreatedId] = useState("")
  const [deduplicatingPhotos, setDeduplicatingPhotos] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [imageQualityByUrl, setImageQualityByUrl] = useState<Record<string, ImageQualityInfo>>({})
  const [imageFingerprintByUrl, setImageFingerprintByUrl] = useState<Record<string, string>>({})
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const createAbortControllerRef = useRef<AbortController | null>(null)
  const imageGroups = useMemo(
    () => getVisibleImageGroups(draft.images, imageQualityByUrl, imageFingerprintByUrl),
    [draft.images, imageQualityByUrl, imageFingerprintByUrl]
  )
  const hiddenLowQualityImages = imageGroups.lowQuality
  const hiddenDuplicateImages = imageGroups.duplicates
  const visibleImages = imageGroups.visible
  const selectedVisibleImages = useMemo(
    () => selectedImages.filter((image) => visibleImages.includes(image)),
    [selectedImages, visibleImages]
  )

  async function getAdminToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace("/login")
      return null
    }

    if ((session.user.email || "").toLowerCase() !== adminEmail) {
      setError("Admin access only.")
      return null
    }

    return session.access_token
  }

  async function previewListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setCreatedId("")
    setLoading(true)

    const token = await getAdminToken()
    if (!token) {
      setLoading(false)
      return
    }

    const response = await fetch("/api/admin-fast-listing-preview", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: sourceUrl }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.ok) {
      setError(result?.error || "Could not read listing from this link.")
      setLoading(false)
      return
    }

    setDraft({ ...emptyDraft, ...result.listing })
    setLoading(false)
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setCreatedId("")
    setCreating(true)
    setUploadProgress({ stage: "photos", uploaded: 0, total: Math.min(visibleImages.length, 80) })
    createAbortControllerRef.current?.abort()
    const abortController = new AbortController()
    createAbortControllerRef.current = abortController

    const token = await getAdminToken()
    if (!token) {
      setCreating(false)
      setUploadProgress(null)
      createAbortControllerRef.current = null
      return
    }

    try {
      const response = await fetch("/api/admin-fast-listing-create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...draft, images: visibleImages }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        setError(result?.error || "Could not create fast listing.")
        setCreating(false)
        setUploadProgress(null)
        createAbortControllerRef.current = null
        return
      }

      if (!response.body) {
        setError("Could not track listing upload progress.")
        setCreating(false)
        setUploadProgress(null)
        createAbortControllerRef.current = null
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let listingId = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          const uploadEvent = JSON.parse(line)

          if (uploadEvent.type === "progress") {
            setUploadProgress({
              stage: uploadEvent.stage === "listing" ? "listing" : "photos",
              uploaded: Number(uploadEvent.uploaded || 0),
              total: Number(uploadEvent.total || 0),
            })
          }

          if (uploadEvent.type === "error") {
            setError(uploadEvent.error || "Could not create fast listing.")
            setCreating(false)
            setUploadProgress(null)
            createAbortControllerRef.current = null
            return
          }

          if (uploadEvent.type === "complete") {
            listingId = uploadEvent.listingId || ""
          }
        }
      }

      if (!listingId) {
        setError("Could not confirm that the listing was created.")
        setCreating(false)
        setUploadProgress(null)
        createAbortControllerRef.current = null
        return
      }

      setCreatedId(listingId)
      setSourceUrl("")
      setDraft(emptyDraft)
      setSelectedImages([])
      setImageQualityByUrl({})
      setImageFingerprintByUrl({})
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setError("Upload cancelled.")
      } else {
        setError(error instanceof Error ? error.message : "Could not create fast listing.")
      }
    } finally {
      setCreating(false)
      setUploadProgress(null)
      createAbortControllerRef.current = null
    }
  }

  function cancelCreateListing() {
    createAbortControllerRef.current?.abort()
  }

  function updateField(field: keyof FastListingDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function updateImages(value: string) {
    const images = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)

    setDraft((current) => ({
      ...current,
      images,
    }))
    setSelectedImages((current) => current.filter((item) => images.includes(item)))
    setImageQualityByUrl((current) =>
      Object.fromEntries(Object.entries(current).filter(([image]) => images.includes(image)))
    )
    setImageFingerprintByUrl((current) =>
      Object.fromEntries(Object.entries(current).filter(([image]) => images.includes(image)))
    )
  }

  function removeImage(image: string) {
    setSelectedImages((current) => current.filter((item) => item !== image))
    setImageQualityByUrl((current) => {
      const next = { ...current }
      delete next[image]
      return next
    })
    setImageFingerprintByUrl((current) => {
      const next = { ...current }
      delete next[image]
      return next
    })
    setDraft((current) => ({
      ...current,
      images: current.images.filter((item) => item !== image),
    }))
  }

  function makeMainImage(image: string) {
    setSelectedImages((current) => current.filter((item) => item !== image))
    setDraft((current) => ({
      ...current,
      images: [image, ...current.images.filter((item) => item !== image)],
    }))
  }

  function toggleSelectedImage(image: string) {
    setSelectedImages((current) =>
      current.includes(image)
        ? current.filter((item) => item !== image)
        : [...current, image]
    )
  }

  function deleteSelectedImages() {
    setDraft((current) => ({
      ...current,
      images: current.images.filter((item) => !selectedImages.includes(item)),
    }))
    setSelectedImages([])
  }

  function clearSelectedImages() {
    setSelectedImages([])
  }

  function selectAllImages() {
    setSelectedImages(Array.from(new Set(visibleImages)))
  }

  async function removeDuplicateImages() {
    setDeduplicatingPhotos(true)

    try {
      const kept: string[] = []
      const fingerprints: string[] = []
      const urlKeys = new Set<string>()

      for (const image of draft.images) {
        const urlKey = getImageKey(image)
        if (urlKeys.has(urlKey)) continue

        const fingerprint = await getImageFingerprint(image)
        const isVisualDuplicate =
          fingerprint &&
          fingerprints.some((existing) => getFingerprintDistance(existing, fingerprint) <= 8)

        if (!isVisualDuplicate) {
          kept.push(image)
          urlKeys.add(urlKey)
          if (fingerprint) fingerprints.push(fingerprint)
        }
      }

      setDraft((current) => ({ ...current, images: kept }))
      setImageQualityByUrl((current) =>
        Object.fromEntries(Object.entries(current).filter(([image]) => kept.includes(image)))
      )
      setImageFingerprintByUrl((current) =>
        Object.fromEntries(Object.entries(current).filter(([image]) => kept.includes(image)))
      )
    } finally {
      setDeduplicatingPhotos(false)
    }
  }

  function saveImageQuality(image: string, element: HTMLImageElement) {
    const width = element.naturalWidth
    const height = element.naturalHeight

    if (!width || !height) return

    setImageQualityByUrl((current) => {
      const existing = current[image]
      if (existing?.width === width && existing.height === height) return current

      return {
        ...current,
        [image]: { width, height },
      }
    })

    if (isLowResolutionImage({ width, height })) {
      setSelectedImages((current) => current.filter((item) => item !== image))
    }

    getImageFingerprint(image).then((fingerprint) => {
      if (!fingerprint) return

      setImageFingerprintByUrl((current) => {
        if (current[image] === fingerprint) return current

        return {
          ...current,
          [image]: fingerprint,
        }
      })
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Admin fast listing
            </p>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">
              Import listing from DoneDeal
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Paste a DoneDeal listing link, review the extracted details, then publish it as an admin free listing without photo limits.
            </p>
          </div>

          <Link
            href="/admin"
            className="h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold hover:bg-slate-50"
          >
            Back to admin
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={previewListing} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="grid gap-2">
            <span className="text-sm font-bold">DoneDeal listing URL</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://www.donedeal.ie/cars-for-sale/..."
                required
                className="h-12 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Reading..." : "Read listing"}
              </button>
            </div>
          </label>
        </form>

        <form onSubmit={createListing} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Listing details</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <Field label="Title" value={draft.title} onChange={(value) => updateField("title", value)} required />
              <Field label="Price" value={draft.price} onChange={(value) => updateField("price", value)} />
              <Field label="Year" value={draft.year} onChange={(value) => updateField("year", value)} />
              <Field label="Make" value={draft.brand} onChange={(value) => updateField("brand", value)} />
              <Field label="Model" value={draft.model} onChange={(value) => updateField("model", value)} />
              <Field label="Mileage km" value={draft.mileage} onChange={(value) => updateField("mileage", value)} />
              <Field label="Fuel" value={draft.fuel} onChange={(value) => updateField("fuel", value)} />
              <Field label="Transmission" value={draft.transmission} onChange={(value) => updateField("transmission", value)} />
              <Field label="Body type" value={draft.bodyType} onChange={(value) => updateField("bodyType", value)} />
              <Field label="Color" value={draft.color} onChange={(value) => updateField("color", value)} />
              <SelectField label="Location" value={draft.location} onChange={(value) => updateField("location", value)} options={counties} />
              <Field label="Engine" value={draft.engineSize} onChange={(value) => updateField("engineSize", value)} />
              <Field label="Total Owners" value={draft.previousOwners} onChange={(value) => updateField("previousOwners", value)} />
              <Field label="NCT Expiry" value={draft.nctExpiry} onChange={(value) => updateField("nctExpiry", value)} />
              <Field label="Doors" value={draft.doors} onChange={(value) => updateField("doors", value)} />
              <Field label="Seats" value={draft.seats} onChange={(value) => updateField("seats", value)} />
              <Field
                label="Phone Number"
                value={draft.contactPhone}
                onChange={(value) => updateField("contactPhone", value)}
                helpText={draft.phoneNotice}
              />
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-bold">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={8}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Photos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {visibleImages.length} usable photos shown from {draft.images.length} image links. First shown photo will be used as the main listing photo.
                </p>
                {hiddenLowQualityImages.length > 0 && (
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    {hiddenLowQualityImages.length} small low resolution photos hidden and will not upload.
                  </p>
                )}
                {hiddenDuplicateImages.length > 0 && (
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    {hiddenDuplicateImages.length} duplicate photos hidden and will not upload.
                  </p>
                )}
              </div>

              {draft.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllImages}
                    className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Select all
                  </button>
                  {selectedVisibleImages.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={deleteSelectedImages}
                        className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100"
                      >
                        Delete selected ({selectedVisibleImages.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedImages}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50"
                      >
                        Clear selection
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={removeDuplicateImages}
                    disabled={deduplicatingPhotos}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deduplicatingPhotos ? "Checking photos..." : "Remove duplicates"}
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={draft.images.join("\n")}
              onChange={(event) => updateImages(event.target.value)}
              rows={6}
              placeholder="One image URL per line"
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
            />

            {visibleImages.length > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {visibleImages.map((image, index) => (
                  <div key={`${image}-${index}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${selectedImages.includes(image) ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"}`}>
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <img
                        src={image}
                        alt=""
                        onLoad={(event) => saveImageQuality(image, event.currentTarget)}
                        className="h-full w-full object-cover"
                      />
                      <label className="absolute right-3 top-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-full bg-white/95 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(image)}
                          onChange={() => toggleSelectedImage(image)}
                          className="h-8 w-8 rounded border-slate-300 accent-blue-600"
                        />
                        Select
                      </label>
                      {index === 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                          Main photo
                        </span>
                      )}
                      <ImageQualityBadge info={imageQualityByUrl[image]} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => makeMainImage(image)}
                        disabled={index === 0}
                        className="h-10 rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Set main
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(image)}
                        className="h-10 rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {visibleImages.length > 0 && (
              <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  {selectedVisibleImages.length > 0
                    ? `${selectedVisibleImages.length} photos selected`
                    : "No photos selected"}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllImages}
                    className="h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedImages}
                    disabled={selectedVisibleImages.length === 0}
                    className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete selected ({selectedVisibleImages.length})
                  </button>
                  {selectedVisibleImages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelectedImages}
                      className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-3">
            {createdId && (
              <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 sm:flex-row sm:items-center sm:justify-between">
                <span>Listing created successfully.</span>
                <div className="flex gap-3">
                  <Link href={`/cars/${createdId}`} className="underline">View listing</Link>
                  <Link href={`/edit-listing/${createdId}`} className="underline">Edit listing</Link>
                </div>
              </div>
            )}

            {creating && uploadProgress && (
              <UploadProgressBar progress={uploadProgress} onCancel={cancelCreateListing} />
            )}

            <button
              type="submit"
              disabled={creating || !draft.title.trim()}
              className="h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating listing..." : "Create admin listing"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function UploadProgressBar({
  progress,
  onCancel,
}: {
  progress: UploadProgress
  onCancel: () => void
}) {
  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.uploaded / progress.total) * 100))
      : progress.stage === "listing"
        ? 95
        : 8
  const label =
    progress.stage === "listing"
      ? "Creating listing..."
      : `Uploading photos ${progress.uploaded} / ${progress.total}`

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 text-sm font-bold text-blue-800 sm:flex-1">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50"
        >
          Cancel upload
        </button>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-blue-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  helpText = "",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  helpText?: string
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-12 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
      />
      {helpText && <span className="text-xs font-semibold leading-5 text-amber-700">{helpText}</span>}
    </label>
  )
}


function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function ImageQualityBadge({ info }: { info?: ImageQualityInfo }) {
  if (!info) {
    return (
      <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">
        Checking size...
      </span>
    )
  }

  const quality = getImageQuality(info)

  return (
    <span
      className={`absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ring-1 ${quality.classes}`}
      title={`${info.width} x ${info.height} pixels`}
    >
      {quality.label} · {info.width}x{info.height}
    </span>
  )
}

function getImageQuality(info: ImageQualityInfo) {
  const area = info.width * info.height

  if (info.width >= 1600 || area >= 1500000) {
    return {
      label: "Best",
      classes: "bg-emerald-600 text-white ring-emerald-700/20",
    }
  }

  if ((info.width >= 1200 && info.height >= 800) || area >= 900000) {
    return {
      label: "Large",
      classes: "bg-green-100 text-green-800 ring-green-200",
    }
  }

  if ((info.width >= 800 && info.height >= 600) || area >= 480000) {
    return {
      label: "OK",
      classes: "bg-amber-100 text-amber-900 ring-amber-200",
    }
  }

  return {
    label: "Small",
    classes: "bg-red-100 text-red-700 ring-red-200",
  }
}

function isLowResolutionImage(info?: ImageQualityInfo) {
  if (!info) return false

  return info.width * info.height < 480000 && (info.width < 800 || info.height < 600)
}

async function getImageFingerprint(src: string) {
  try {
    const image = await loadImage(src)
    const canvas = document.createElement("canvas")
    const size = 8
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return ""

    context.drawImage(image, 0, 0, size, size)
    const data = context.getImageData(0, 0, size, size).data
    const values: number[] = []

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] || 0
      const green = data[index + 1] || 0
      const blue = data[index + 2] || 0
      values.push(red * 0.299 + green * 0.587 + blue * 0.114)
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    return values.map((value) => (value >= average ? "1" : "0")).join("")
  } catch {
    return ""
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load image"))
    image.src = src
  })
}

function getFingerprintDistance(first: string, second: string) {
  if (!first || !second || first.length !== second.length) return Number.POSITIVE_INFINITY

  let distance = 0
  for (let index = 0; index < first.length; index++) {
    if (first[index] !== second[index]) distance++
  }

  return distance
}
function getImageKey(value: string) {
  const normalized = normalizeImageUrl(value)

  try {
    const url = new URL(normalized)
    const params = new URLSearchParams(url.search)
    params.delete("signature")
    params.delete("expires")
    params.delete("x-amz-signature")
    params.delete("x-amz-expires")
    url.search = params.toString()
    return (url.origin + url.pathname + url.search).toLowerCase()
  } catch {
    return normalized.split("?signature=")[0].toLowerCase()
  }
}

function normalizeImageUrl(value: string) {
  return String(value || "")
    .trim()
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("&amp;", "&")
    .replace(/[),.;]+$/g, "")
}






