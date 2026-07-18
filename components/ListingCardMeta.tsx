import type { ReactNode } from "react"

export type ListingCardMetaIcon = "year" | "mileage" | "fuel" | "transmission" | "location"

export default function ListingCardMeta({
  icon,
  children,
}: {
  icon: ListingCardMetaIcon
  children: ReactNode
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ListingCardMetaIconView icon={icon} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

function ListingCardMetaIconView({ icon }: { icon: ListingCardMetaIcon }) {
  const commonProps = {
    className: "h-3.5 w-3.5 flex-none text-[#005BFF]",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  }

  if (icon === "year") {
    return (
      <svg {...commonProps}>
        <path d="M7 3v3M17 3v3M4.5 9.2h15M6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v9.4a2.8 2.8 0 0 1-2.8 2.8H6.8A2.8 2.8 0 0 1 4 17.2V7.8A2.8 2.8 0 0 1 6.8 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === "mileage") {
    return (
      <svg {...commonProps}>
        <path d="M4.2 15.8a8 8 0 1 1 15.6 0M12 12l3.2-3.2M7.2 15.8h9.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 14.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (icon === "fuel") {
    return (
      <svg {...commonProps}>
        <path d="M6.5 20V5.8A2.3 2.3 0 0 1 8.8 3.5h5.4a2.3 2.3 0 0 1 2.3 2.3V20M5 20h13M7.6 9.5h7.8M16.5 7.2l3 3v6.1a1.7 1.7 0 0 0 3.4 0v-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === "transmission") {
    return (
      <svg {...commonProps}>
        <path d="M7 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 6.5v11M17 6.5v11M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
