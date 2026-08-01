import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

const makes = [
  "Abarth", "Alfa Romeo", "Audi", "BMW", "BYD", "Citroen", "Cupra", "Dacia", "Fiat",
  "Ford", "Honda", "Hyundai", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Mazda",
  "Mercedes-Benz", "MG", "Mini", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Porsche",
  "Renault", "Seat", "Skoda", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen",
  "Volvo",
]

const countyNames = [
  "Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry", "Donegal", "Down",
  "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim",
  "Limerick", "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon",
  "Sligo", "Tipperary", "Tyrone", "Waterford", "Westmeath", "Wexford", "Wicklow",
]

type JsonRecord = Record<string, unknown>

export async function GET(request: Request) {
  const url = new URL(request.url)
  const image = normalizeUrl(url.searchParams.get("image") || "")

  if (!isDoneDealMediaImage(image)) {
    return NextResponse.json({ ok: false, error: "Invalid image URL." }, { status: 400 })
  }

  try {
    const response = await fetch(image, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.donedeal.ie/",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "Could not read image." }, { status: 502 })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Invalid image response." }, { status: 400 })
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read image." }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  const body = await request.json()
  const url = String(body.url || "").trim()

  if (!url || !/^https?:\/\/([^/]+\.)?donedeal\.ie\//i.test(url)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid DoneDeal.ie listing URL." },
      { status: 400 }
    )
  }

  const listingId = extractListingId(url)
  const apiListing = await fetchDoneDealListingApi(listingId, url)

  if (apiListing) {
    const listing = await parseDoneDealHtml("", url, apiListing)
    return NextResponse.json({ ok: true, listing })
  }

  const response = await fetchDoneDealHtml(url)

  if (!response?.ok) {
    return NextResponse.json(
      { ok: false, error: "DoneDeal did not allow this listing to be read." },
      { status: 502 }
    )
  }

  const html = await response.text()
  const listing = await parseDoneDealHtml(html, url, null)

  return NextResponse.json({ ok: true, listing })
}

async function fetchDoneDealHtml(url: string) {
  try {
    return await fetch(url, {
      headers: doneDealHtmlHeaders(url),
    })
  } catch {
    return null
  }
}

function doneDealHtmlHeaders(url: string) {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IE,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: new URL(url).origin,
  }
}

async function fetchDoneDealListingApi(listingId: string, sourceUrl: string) {
  if (!listingId) return null

  try {
    const response = await fetch(`https://www.donedeal.ie/ddapi/v1/listings/${listingId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        Accept: "application/json",
        Referer: sourceUrl,
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function parseDoneDealHtml(html: string, sourceUrl: string, apiListing: unknown) {
  const listingId = extractListingId(sourceUrl)
  const jsonRoots = [apiListing, ...readJsonRoots(html)].filter(Boolean)
  const listingObjects = findListingObjects(jsonRoots, listingId)
  const relevantRoots = listingObjects.length ? listingObjects : jsonRoots
  const apiRoots = apiListing ? [apiListing] : []
  const lines = toCleanLines(stripTagsWithLines(html))
  const specs = extractSpecs(lines, relevantRoots)
  const metaTitle = readMeta(html, "og:title") || readTitle(html)
  const jsonTitle = firstJsonString(apiRoots, ["header"]) || firstJsonString(relevantRoots, ["title", "name", "header"])
  const visibleTitle = extractVisibleTitle(lines)
  const title = bestTitle(visibleTitle, jsonTitle, metaTitle, specs)
  const vehicle = normalizeVehicle(specs, title)
  const description = directString(apiListing, "description") || chooseDescription(relevantRoots, lines, title)
  const priceSource =
    firstJsonString(apiRoots, ["price"]) ||
    firstJsonString(apiRoots, ["amount"]) ||
    specs.price ||
    extractVisiblePrice(lines) ||
    firstJsonString(relevantRoots, ["price", "amount"]) ||
    metaTitle
  const contactPhone = choosePhone(relevantRoots, specs)

  return {
    sourceUrl,
    title,
    price: String(extractNumber(priceSource) || ""),
    brand: vehicle.brand,
    model: vehicle.model,
    year: String(extractYear(specs.year || title) || ""),
    mileage: String(extractMileage(specs.mileage || description || "") || ""),
    fuel: cleanImportedValue(specs.fuel || specs.fuelType || ""),
    transmission: cleanImportedValue(specs.transmission || ""),
    bodyType: cleanImportedValue(specs.bodyType || specs.body || ""),
    color: cleanImportedValue(specs.color || specs.colour || ""),
    location: chooseLocation(relevantRoots, lines, specs),
    engineSize: normalizeEngineSize(specs.engineSize || specs.engine || ""),
    previousOwners: cleanImportedValue(specs.owners || specs.previousOwners || ""),
    nctExpiry: normalizeNctDate(specs.nct || specs.nctExpiry || description),
    doors: cleanImportedValue(specs.doors || ""),
    seats: cleanImportedValue(specs.seats || ""),
    contactPhone,
    phoneNotice: contactPhone ? "" : choosePhoneNotice(relevantRoots),
    description,
    images: await extractImages(html, relevantRoots),
  }
}

function extractListingId(url: string) {
  const match = url.match(/\/(\d{5,})(?:[/?#]|$)/)
  return match?.[1] || ""
}

function readJsonRoots(html: string) {
  const roots: unknown[] = []
  const scriptRegex = /<script[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html))) {
    const text = decode(match[1]).trim()
    if (!text) continue

    try {
      roots.push(JSON.parse(text))
    } catch {}
  }

  const nextMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
  if (nextMatch?.[1]) {
    try {
      roots.push(JSON.parse(decode(nextMatch[1]).trim()))
    } catch {}
  }

  return roots
}

function findListingObjects(roots: unknown[], listingId: string) {
  if (!listingId) return []
  const found: Array<{ object: JsonRecord; score: number }> = []

  for (const root of roots) {
    walkObjects(root, (object) => {
      const score = scoreListingObject(object, listingId)
      if (score > 0) found.push({ object, score })
    })
  }

  return found
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.object)
}

function walkObjects(value: unknown, visit: (object: JsonRecord) => void) {
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    value.forEach((item) => walkObjects(item, visit))
    return
  }

  const object = value as JsonRecord
  visit(object)

  for (const item of Object.values(object)) {
    walkObjects(item, visit)
  }
}

function scoreListingObject(object: JsonRecord, listingId: string) {
  let score = 0

  for (const [key, value] of Object.entries(object)) {
    const keyText = key.toLowerCase()
    const valueText = typeof value === "string" || typeof value === "number" ? String(value) : ""

    if (valueText === listingId) score += /^(id|adid|listingid|ad_id|listing_id)$/i.test(key) ? 100 : 20
    if (valueText.includes(`/422`) && valueText.includes(listingId)) score += 40
    if (valueText.includes(listingId)) score += 20
    if (/title|description|price|make|model|mileage|county|location/i.test(keyText)) score += 1
  }

  return score
}

function extractSpecs(lines: string[], roots: unknown[]) {
  const specs: Record<string, string> = {}

  for (const root of roots) {
    collectSpecs(root, specs)
  }

  const textSpecs = extractSpecsFromLines(lines)
  return { ...specs, ...textSpecs }
}

function collectSpecs(value: unknown, specs: Record<string, string>) {
  if (!value || typeof value !== "object") return

  if (Array.isArray(value)) {
    value.forEach((item) => collectSpecs(item, specs))
    return
  }

  const object = value as JsonRecord
  const label = getAny(object, ["label", "name", "title", "displayName", "display_name", "key"])
  const itemValue = getAny(object, ["value", "displayValue", "display_value", "text", "content"])
  const field = normalizeSpecLabel(label)

  if (field && isUsefulSpecValue(itemValue)) {
    setSpec(specs, field, String(itemValue))
  }

  for (const [key, item] of Object.entries(object)) {
    const directField = normalizeSpecLabel(key)
    if (directField && isUsefulSpecValue(item)) {
      setSpec(specs, directField, String(item))
    }

    collectSpecs(item, specs)
  }
}

function extractSpecsFromLines(lines: string[]) {
  const specs: Record<string, string> = {}

  for (let index = 0; index < lines.length; index++) {
    const inline = lines[index].match(/^([A-Za-z .()/]+):\s*(.+)$/)
    if (inline) {
      const inlineField = normalizeSpecLabel(inline[1])
      if (inlineField && isUsefulSpecValue(inline[2])) {
        setSpec(specs, inlineField, inline[2])
        continue
      }
    }

    const field = normalizeSpecLabel(lines[index])
    const next = lines[index + 1]

    if (field && normalizeSpecLabel(next)) continue

    if (field && isUsefulSpecValue(next)) {
      setSpec(specs, field, next)
    }
  }

  return specs
}

function setSpec(specs: Record<string, string>, field: string, value: string) {
  const cleaned = cleanImportedValue(value)
  if (!cleaned || cleaned.length > 90) return
  if (looksLikePageNoise(cleaned)) return
  if (specs[field] && !isBetterSpecValue(field, specs[field], cleaned)) return
  specs[field] = cleaned
}

function isBetterSpecValue(field: string, current: string, next: string) {
  if (field === "mileage") {
    const currentHasUnit = /\b(?:km|kms|kilometres|kilometers|miles)\b/i.test(current)
    const nextHasUnit = /\b(?:km|kms|kilometres|kilometers|miles)\b/i.test(next)

    if (currentHasUnit && !nextHasUnit) return false
    if (!currentHasUnit && nextHasUnit) return true
  }

  return false
}

function cleanImportedValue(value: unknown) {
  const text = clean(value)
  if (!text) return ""
  if (normalizeSpecLabel(text)) return ""

  return text
}

function normalizeSpecLabel(value: unknown) {
  const label = clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "")

  const map: Record<string, string> = {
    make: "make",
    brand: "brand",
    manufacturer: "make",
    model: "model",
    year: "year",
    price: "price",
    mileage: "mileage",
    kilometres: "mileage",
    kilometers: "mileage",
    fuel: "fuel",
    fueltype: "fuel",
    transmission: "transmission",
    body: "bodyType",
    bodytype: "bodyType",
    vehicletype: "bodyType",
    colour: "color",
    color: "color",
    county: "location",
    location: "location",
    addresslocality: "location",
    locality: "location",
    phone: "phone",
    phonenumber: "phone",
    contactphone: "phone",
    mobilenumber: "phone",
    mobile: "phone",
    sellerphone: "phone",
    sellerphonenumber: "phone",
    trim: "trim",
    trimlevel: "trimLevel",
    doors: "doors",
    numberofdoors: "doors",
    noofdoors: "doors",
    seats: "seats",
    numberofseats: "seats",
    noofseats: "seats",
    enginesize: "engineSize",
    enginesizel: "engineSize",
    engine: "engineSize",
    enginecapacity: "engineSize",
    enginepower: "enginePower",
    power: "enginePower",
    totalowners: "owners",
    previousowners: "owners",
    owners: "owners",
    nctexpiry: "nct",
    nctvaliduntil: "nct",
    nctvalidto: "nct",
    nct: "nct",
  }

  return map[label] || ""
}

function chooseDescription(roots: unknown[], lines: string[], title: string) {
  const visible = extractVisibleDescription(lines)
  if (visible) return visible

  const candidates: string[] = []
  for (const root of roots) {
    collectStringsByKey(root, ["description", "body", "sellerdescription", "seller_description"], candidates)
  }

  const cleanCandidates = candidates
    .map((item) => clean(item).replace(/\s+View images?\s+\d+\s*$/i, ""))
    .filter((item) => item.length > 20 && !looksLikeBadDescription(item))
    .sort((a, b) => descriptionScore(b, title) - descriptionScore(a, title))

  return (cleanCandidates[0] || "").slice(0, 5000)
}

function descriptionScore(value: string, title: string) {
  let score = value.length
  const titleWords = title.toLowerCase().split(/\s+/).filter((word) => word.length > 2)
  for (const word of titleWords) {
    if (value.toLowerCase().includes(word)) score += 100
  }
  if (/nct|tax|keys|bluetooth|touch|wheel|service|owner/i.test(value)) score += 300
  if (/warranty available from this dealer|get in touch to find out more|third parties|may not be fully accurate|greenlight|history check|finance available/i.test(value)) score -= 2000
  return score
}

function extractVisibleDescription(lines: string[]) {
  const start = lines.findIndex((line) => /^description$/i.test(line))
  if (start < 0) return ""

  const stopLabels = [
    "Some information displayed",
    "Report Ad",
    "Recommended ads",
    "Vehicle Overview",
    "Overview",
    "Vehicle History",
    "Warranty",
    "Finance",
    "Seller",
    "Show Phone Number",
  ]

  const parts: string[] = []

  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index]
    if (stopLabels.some((label) => line.toLowerCase().startsWith(label.toLowerCase()))) break
    if (/^(make|model|year|price|mileage|fuel type|transmission|body type|engine|nct|doors|seats|total owners)$/i.test(line)) break
    if (/^Read Less$/i.test(line) || /^Read More$/i.test(line)) continue
    parts.push(line)
  }

  const description = parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return looksLikeBadDescription(description) ? "" : description.slice(0, 5000)
}

function looksLikeBadDescription(value: string) {
  return /warranty available from this dealer|DoneDeal|cookie|privacy|similar ads|Greenlight|history check|third parties|may not be fully accurate/i.test(value)
}

function chooseLocation(roots: unknown[], lines: string[], specs: Record<string, string>) {
  const specCounty = cleanCounty(specs.location || "")
  if (specCounty) return specCounty

  const visible = extractVisibleLocation(lines)
  if (visible) return visible

  const candidates: string[] = []
  for (const root of roots) {
    collectStringsByKey(root, ["county", "location", "addresslocality", "sellercounty", "seller_county"], candidates)
  }

  const good = candidates
    .map(cleanCounty)
    .filter((item) => item && !looksLikePageNoise(item))
    .sort((a, b) => locationScore(b) - locationScore(a))

  return good[0] || ""
}

function locationScore(value: string) {
  let score = 100 - value.length
  if (/^Co\.\s/i.test(value)) score += 25
  return score
}

function choosePhone(roots: unknown[], specs: Record<string, string>) {
  const specPhone = cleanPhone(specs.phone || "")
  if (specPhone) return specPhone

  const candidates: string[] = []
  for (const root of roots) {
    collectPhoneStrings(root, candidates)
  }

  for (const candidate of candidates) {
    const phone = cleanPhone(candidate)
    if (phone) return phone
  }

  return ""
}

function choosePhoneNotice(roots: unknown[]) {
  if (hasPhoneResponse(roots)) {
    return "DoneDeal shows this seller has a phone number, but hides it behind Show Phone Number / reCAPTCHA. Open the DoneDeal ad, reveal the number, then paste it here before creating the listing."
  }

  return ""
}

function hasPhoneResponse(roots: unknown[]) {
  let found = false

  for (const root of roots) {
    walkObjects(root, (object) => {
      if (object.phoneResponse === true) found = true
    })
  }

  return found
}

function collectPhoneStrings(value: unknown, output: string[]) {
  if (!value || typeof value !== "object") return

  if (Array.isArray(value)) {
    value.forEach((item) => collectPhoneStrings(item, output))
    return
  }

  for (const [key, item] of Object.entries(value as JsonRecord)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, "")
    if (
      typeof item !== "object" &&
      isUsefulSpecValue(item) &&
      /(phone|mobile|telephone|contactnumber|sellernumber)/i.test(normalizedKey)
    ) {
      output.push(String(item))
    }
    collectPhoneStrings(item, output)
  }
}

function collectStringsByKey(value: unknown, keys: string[], output: string[]) {
  if (!value || typeof value !== "object") return

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringsByKey(item, keys, output))
    return
  }

  for (const [key, item] of Object.entries(value as JsonRecord)) {
    if (keys.includes(key.toLowerCase()) && typeof item !== "object" && isUsefulSpecValue(item)) {
      output.push(String(item))
    }
    collectStringsByKey(item, keys, output)
  }
}

function normalizeVehicle(specs: Record<string, string>, title: string) {
  let brand = clean(specs.make || specs.brand || "")
  let model = clean(specs.model || "")
  const titleBrand = makes.find((make) => new RegExp(`\\b${escapeRegExp(make).replace("\\-", "[- ]")}\\b`, "i").test(title)) || ""

  if (!makes.some((make) => sameText(make, brand)) && makes.some((make) => sameText(make, model))) {
    const oldBrand = brand
    brand = model
    model = oldBrand
  }

  if (!brand && titleBrand) brand = titleBrand
  if (titleBrand && !sameText(brand, titleBrand)) brand = titleBrand

  if (brand && (!model || makes.some((make) => sameText(make, model)))) {
    model = inferModelFromTitle(title, brand)
  }

  return { brand, model }
}

function inferModelFromTitle(title: string, brand: string) {
  const after = title.split(new RegExp(escapeRegExp(brand), "i"))[1] || ""
  const withoutYear = after.replace(/\b(19|20)\d{2}\b.*$/, "")
  const firstPart = withoutYear.split(/[-|,]/)[0]
  const words = clean(firstPart)
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return ""

  const modelWords: string[] = []
  for (const word of words) {
    if (/^(tdi|tsi|fsi|gt|gti|gte|r-line|m-sport|se|sport|automatic|manual|diesel|petrol|hybrid)$/i.test(word)) break
    if (/^\d\.\d/.test(word)) break
    modelWords.push(word)
    if (modelWords.length >= 2) break
  }

  return clean(modelWords.join(" "))
}

function extractVisibleTitle(lines: string[]) {
  const index = lines.findIndex((line) => makes.some((make) => line.toLowerCase().startsWith(make.toLowerCase() + " ")))
  return index >= 0 ? lines[index] : ""
}

function extractVisiblePrice(lines: string[]) {
  return lines.find((line) => /^(€|EUR)\s?[\d,]+/i.test(line)) || ""
}

function extractVisibleLocation(lines: string[]) {
  const countyPattern = countyNames.join("|")

  for (const line of lines) {
    if (/\bviews\b/i.test(line)) {
      const match = line.match(new RegExp(`(?:views|mins|hours|days)\\s*(?:•|\\|)?\\s*([A-Za-z'. -]+,\\s*(?:${countyPattern}))\\b`, "i"))
      if (match?.[1]) return cleanCounty(match[1])
    }
  }

  for (let index = 0; index < lines.length; index++) {
    if (/Verified Private Seller|Private Seller|Dealership/i.test(lines[index])) {
      const joined = `${lines[index]} ${lines[index + 1] || ""} ${lines[index + 2] || ""}`
      const match = joined.match(new RegExp(`\\b([A-Za-z'. -]+,\\s*(?:${countyPattern})|(?:${countyPattern}))\\b`, "i"))
      if (match?.[1]) return cleanCounty(match[1])
    }
  }

  return ""
}

async function extractImages(html: string, roots: unknown[]) {
  const byKey = new Map<string, string>()

  for (const root of roots) {
    collectImageStrings(root, byKey)
  }

  addImage(byKey, readMeta(html, "og:image"))

  const regex = /https?:\\?\/\\?\/media\.donedeal\.ie\/[^"'\\<>\s)]+/gi
  const matches = html.match(regex) || []

  for (const item of matches) {
    addImage(byKey, item)
  }

  return Array.from(byKey.values()).slice(0, 80)
}

function collectImageStrings(value: unknown, byKey: Map<string, string>) {
  if (!value) return

  if (typeof value === "string") {
    addImage(byKey, value)
    return
  }

  if (typeof value !== "object") return

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageStrings(item, byKey))
    return
  }

  for (const item of Object.values(value as JsonRecord)) {
    collectImageStrings(item, byKey)
  }
}

function addImage(byKey: Map<string, string>, value: string) {
  const url = normalizeUrl(value)
  if (!isDoneDealMediaImage(url)) return
  const key = imageKey(url)
  if (!byKey.has(key)) byKey.set(key, url)
}

function imageKey(url: string) {
  try {
    const parsed = new URL(url)
    const doneDealKey = readDoneDealMediaKey(parsed)
    if (doneDealKey) return doneDealKey

    return parsed.origin + parsed.pathname
  } catch {
    return url.split("?")[0]
  }
}

function readDoneDealMediaKey(url: URL) {
  for (const segment of url.pathname.split("/").filter(Boolean)) {
    const decoded = decodeBase64UrlJson(segment)
    const key = findMediaObjectKey(decoded)

    if (key) return key.toLowerCase()
  }

  return ""
}

function decodeBase64UrlJson(value: string): unknown {
  try {
    const normalized = decodeURIComponent(value)
      .replace(/-/g, "+")
      .replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
  } catch {
    return null
  }
}

function findMediaObjectKey(value: unknown): string {
  if (!value || typeof value !== "object") return ""

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaObjectKey(item)
      if (found) return found
    }
    return ""
  }

  const object = value as JsonRecord
  const directKeys = ["key", "path", "objectKey", "object_key", "imageKey", "image_key"]

  for (const key of directKeys) {
    const item = object[key]
    if (typeof item === "string" && looksLikeMediaObjectKey(item)) {
      return item
    }
  }

  for (const item of Object.values(object)) {
    const found = findMediaObjectKey(item)
    if (found) return found
  }

  return ""
}

function looksLikeMediaObjectKey(value: string) {
  return /(?:photos?|images?)\//i.test(value) || /\.(?:jpe?g|png|webp)(?:$|\?)/i.test(value)
}

function isDoneDealMediaImage(value: string) {
  const url = normalizeUrl(value)
  if (!/^https:\/\/media\.donedeal\.ie\//i.test(url)) return false
  if (/favicon|logo|avatar|profile|placeholder|advert|adserver/i.test(url)) return false
  return true
}

function normalizeUrl(value: string) {
  return clean(value)
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("&amp;", "&")
    .replace(/[),.;]+$/g, "")
}

function bestTitle(visibleTitle: string, jsonTitle: string, metaTitle: string, specs: Record<string, string>) {
  const candidates = [visibleTitle, jsonTitle, metaTitle]
    .map((item) => sanitizeTitle(item))
    .filter(Boolean)

  const fromSpecs = [specs.make, specs.model, specs.year].filter(Boolean).join(" ")
  if (fromSpecs.length > 8) candidates.push(clean(fromSpecs))

  const title = candidates.find((item) => item.length >= 5) || ""
  return title.slice(0, 120)
}

function sanitizeTitle(value: string) {
  return clean(value)
    .replace(/\s+for\s+sale\b.*$/i, "")
    .replace(/\s+on\s+DoneDeal\b.*$/i, "")
    .replace(/\s*-\s*DoneDeal.*$/i, "")
    .replace(/\s*\|\s*DoneDeal.*$/i, "")
}

function directString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ""

  const item = (value as JsonRecord)[key]
  return typeof item === "string" || typeof item === "number" ? clean(item) : ""
}

function firstJsonString(roots: unknown[], keys: string[]) {
  for (const root of roots) {
    const found = findFirstString(root, keys.map((key) => key.toLowerCase()))
    if (found) return found
  }
  return ""
}

function findFirstString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return ""

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstString(item, keys)
      if (found) return found
    }
    return ""
  }

  for (const [key, item] of Object.entries(value as JsonRecord)) {
    if (keys.includes(key.toLowerCase()) && typeof item !== "object" && isUsefulSpecValue(item)) {
      return String(item)
    }
  }

  for (const item of Object.values(value as JsonRecord)) {
    const found = findFirstString(item, keys)
    if (found) return found
  }

  return ""
}

function getAny(value: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) return value[key]
  }
  return ""
}

function isUsefulSpecValue(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === "object") return false
  const text = clean(value)
  if (!text || text.length > 120) return false
  if (/^(true|false|null|undefined)$/i.test(text)) return false
  return true
}

function looksLikePageNoise(value: string) {
  return /DoneDeal|cookie|privacy|advert|campaign|favicon|marketplace|frontend/i.test(value)
}

function normalizeEngineSize(value: unknown) {
  const text = clean(value)
  const litres = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter|litres|liters)\b/i)
  if (litres) return litres[1].replace(",", ".")

  const plain = text.match(/\b(\d+(?:[.,]\d+)?)\b/)
  return plain ? plain[1].replace(",", ".") : ""
}

function extractNumber(value: string) {
  const match = String(value || "").replace(/,/g, "").match(/\d{2,}/)
  return match ? Number(match[0]) : null
}

function extractYear(value: string) {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

function extractMileage(value: string) {
  const match = String(value || "").replace(/,/g, "").match(/(\d{3,})\s*(km|kms|kilometres|kilometers|miles)/i)
  return match ? Number(match[1]) : null
}

function normalizeNctDate(value: string) {
  const text = clean(value)
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dayMonthYear = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/)
  if (dayMonthYear) {
    const day = dayMonthYear[1].padStart(2, "0")
    const month = dayMonthYear[2].padStart(2, "0")
    const year = dayMonthYear[3].length === 2 ? `20${dayMonthYear[3]}` : dayMonthYear[3]
    return `${year}-${month}-${day}`
  }

  const monthYear = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i)
  if (monthYear) {
    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
    }
    const key = monthYear[1].toLowerCase()
    return `${monthYear[2]}-${monthMap[key] || "01"}-01`
  }

  return ""
}

function stripTagsWithLines(value: string) {
  return decode(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|td|th|section|article|h1|h2|h3|span|button)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
}

function toCleanLines(value: string) {
  return value
    .split("\n")
    .map((line) => clean(line))
    .filter(Boolean)
}

function cleanCounty(value: string) {
  const text = clean(value)
  const county = countyNames.find((name) => new RegExp(`\\b${name}\\b`, "i").test(text))
  return county ? `Co. ${county}` : ""
}

function cleanPhone(value: unknown) {
  const text = clean(value)
  const patterns = [/(?:\+353|00353|0)\s?8[356789](?:[\s-]?\d){7}\b/g]

  for (const pattern of patterns) {
    const matches = text.match(pattern) || []
    for (const match of matches) {
      const phone = formatIrishMobilePhone(match)
      if (phone) return phone
    }
  }

  return ""
}

function formatIrishMobilePhone(value: string) {
  const hasInternationalPrefix = /^\s*(?:\+353|00353)/.test(value)
  const digits = value.replace(/\D/g, "")

  if (/^08[356789]\d{7}$/.test(digits)) {
    return hasInternationalPrefix ? `+353 ${digits.slice(1, 3)} ${digits.slice(3)}` : digits
  }

  if (/^3538[356789]\d{7}$/.test(digits)) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
  }

  if (/^003538[356789]\d{7}$/.test(digits)) {
    return `+353 ${digits.slice(5, 7)} ${digits.slice(7)}`
  }

  return ""
}

function sameText(a: unknown, b: unknown) {
  return clean(a).toLowerCase() === clean(b).toLowerCase()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function clean(value: unknown) {
  const text = decode(String(value || "")).replace(/\s+/g, " ").trim()
  if (isEmptyPlaceholder(text)) return ""

  return text
}

function isEmptyPlaceholder(value: string) {
  const normalized = value.replace(/\s/g, "")
  return /^[-–—]+$/.test(normalized) || /^n\/?a$/i.test(normalized)
}

function readMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decode(match[1])
  }

  return ""
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i)
  return match?.[1] ? decode(match[1]) : ""
}

function decode(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}







