type ListingStatusBadgesProps = {
  listing: {
    nct_expiry?: string | null
    tax_expiry?: string | null
  }
  compact?: boolean
}

export default function ListingStatusBadges({
  listing,
  compact = false,
}: ListingStatusBadgesProps) {
  const nct = getDateStatus(listing.nct_expiry)
  const tax = getDateStatus(listing.tax_expiry)

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "text-[10.5px]" : "text-[11px]"}`}>
      <StatusBadge label="NCT" status={nct} />
      <StatusBadge label="Tax" status={tax} />
    </div>
  )
}

function StatusBadge({
  label,
  status,
}: {
  label: string
  status: DateStatus
}) {
  const valid = status.valid

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold ${
        valid
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          valid ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {label}: {status.label}
    </span>
  )
}

type DateStatus = {
  valid: boolean
  label: string
}

function getDateStatus(value: string | null | undefined): DateStatus {
  const date = parseDate(value)

  if (!date) {
    return { valid: false, label: "Expired" }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(23, 59, 59, 999)

  return {
    valid: date >= today,
    label: formatShortDate(date),
  }
}

function parseDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-IE", {
    month: "2-digit",
    year: "2-digit",
  })
}
