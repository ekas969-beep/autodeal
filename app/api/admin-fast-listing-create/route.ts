import { NextResponse } from "next/server"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { freeListingFields } from "@/config/plans"
import { revalidatePublicListings } from "@/lib/listings-revalidation"

const adminEmail = "ekas969@gmail.com"
const imageBucket = "listing-images"
const encoder = new TextEncoder()

type AdminResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const body = await request.json()
  const title = clean(body.title)

  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 })
  }

  const price = toNumber(body.price)
  const year = toNumber(body.year)
  const mileage = toNumber(body.mileage)

  if (price === null) {
    return NextResponse.json({ ok: false, error: "Price is required and must be a number." }, { status: 400 })
  }

  if (year === null) {
    return NextResponse.json({ ok: false, error: "Year is required and must be a number." }, { status: 400 })
  }

  const rawImages = Array.isArray(body.images)
    ? body.images.map((item: unknown) => clean(item)).filter(Boolean)
    : []
  const contactPhone = cleanPhone(body.contactPhone)
  const listingPlanFields = freeListingFields()

  const stream = new ReadableStream({
    async start(controller) {
      function send(value: Record<string, unknown>) {
        if (request.signal.aborted) return
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
      }

      try {
        send({ type: "progress", stage: "photos", uploaded: 0, total: Math.min(rawImages.length, 80) })

        const imageUrls = await uploadRemoteImages(
          admin.supabase,
          rawImages,
          admin.user.id,
          request.signal,
          (uploaded, total) => {
            send({ type: "progress", stage: "photos", uploaded, total })
          }
        )

        send({ type: "progress", stage: "listing", uploaded: imageUrls.length, total: imageUrls.length })
        throwIfAborted(request.signal)

        const payload = {
          user_id: admin.user.id,
          category: "cars",
          vehicle_type: "cars",
          ...listingPlanFields,
          photo_limit: Math.max(imageUrls.length, 99),
          title,
          price,
          brand: clean(body.brand),
          model: clean(body.model),
          year,
          mileage,
          fuel: clean(body.fuel),
          transmission: clean(body.transmission),
          body_type: clean(body.bodyType),
          color: clean(body.color),
          location: clean(body.location),
          engine_size: emptyToNull(normalizeEngineSize(body.engineSize)),
          engine_power: emptyToNull(body.enginePower),
          previous_owners: emptyToNull(body.previousOwners),
          nct_expiry: emptyToNull(body.nctExpiry),
          tax_expiry: null,
          annual_tax: null,
          doors: emptyToNull(body.doors),
          seats: emptyToNull(body.seats),
          registration_country: "Ireland",
          vin: "",
          seller_type: "Dealership",
          phone: contactPhone,
          contact_phone: contactPhone,
          email: "",
          contact_email: "",
          description: clean(body.description),
          images: imageUrls,
          featured_image_url: imageUrls[0] || null,
        }

        const { data, error } = await admin.supabase
          .from("listings")
          .insert(payload)
          .select("id")
          .single()

        if (error) {
          send({ type: "error", error: error.message })
          return
        }

        revalidatePublicListings()
        send({ type: "complete", listingId: data.id })
      } catch (error) {
        if (request.signal.aborted) return
        send({ type: "error", error: error instanceof Error ? error.message : "Could not create fast listing." })
      } finally {
        try {
          controller.close()
        } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}

async function requireAdmin(request: Request): Promise<AdminResult> {
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }),
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Admin settings are missing." }, { status: 500 }),
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || (data.user?.email || "").toLowerCase() !== adminEmail) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Admin access only." }, { status: 403 }),
    }
  }

  return { ok: true, user: data.user, supabase }
}

async function uploadRemoteImages(
  supabase: SupabaseClient,
  urls: string[],
  userId: string,
  signal: AbortSignal,
  onProgress?: (uploaded: number, total: number) => void
) {
  const uploaded: string[] = []
  const limitedUrls = urls.slice(0, 80)
  const total = limitedUrls.length

  for (const [index, url] of limitedUrls.entries()) {
    throwIfAborted(signal)

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        },
        signal,
      })

      throwIfAborted(signal)

      if (!response.ok) {
        uploaded.push(url)
        continue
      }

      const contentType = response.headers.get("content-type") || "image/jpeg"
      const extension = contentType.includes("webp")
        ? "webp"
        : contentType.includes("png")
          ? "png"
          : "jpg"
      const bytes = Buffer.from(await response.arrayBuffer())
      const fileName = `${userId}/admin-fast-${crypto.randomUUID()}.${extension}`

      const { error } = await supabase.storage.from(imageBucket).upload(fileName, bytes, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        uploaded.push(url)
        continue
      }

      const { data } = supabase.storage.from(imageBucket).getPublicUrl(fileName)
      uploaded.push(data.publicUrl)
    } catch {
      throwIfAborted(signal)
      uploaded.push(url)
    } finally {
      onProgress?.(index + 1, total)
    }
  }

  return Array.from(new Set(uploaded))
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new Error("Upload cancelled.")
  }
}


function clean(value: unknown) {
  return String(value || "").trim().slice(0, 10000)
}

function normalizeEngineSize(value: unknown) {
  const text = clean(value)
  const litres = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter|litres|liters)\b/i)
  if (litres) return litres[1].replace(",", ".")

  const plain = text.match(/\b(\d+(?:[.,]\d+)?)\b/)
  return plain ? plain[1].replace(",", ".") : ""
}

function cleanPhone(value: unknown) {
  return clean(value)
    .replace(/[^\d+() -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
}

function emptyToNull(value: unknown) {
  const text = clean(value)
  return text ? text : null
}

function toNumber(value: unknown) {
  const text = clean(value).replace(/,/g, "")
  if (!text) return null
  const match = text.match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

