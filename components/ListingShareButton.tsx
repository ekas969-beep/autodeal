"use client"

import { useEffect, useRef, useState } from "react"

export default function ListingShareButton({
  title,
  className = "",
}: {
  title: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", closeMenu)
    return () => document.removeEventListener("mousedown", closeMenu)
  }, [])

  function getShareData() {
    const url = window.location.href
    const text = `${title} ${url}`
    const encodedUrl = encodeURIComponent(url)
    const encodedTitle = encodeURIComponent(title)
    const encodedText = encodeURIComponent(text)

    return {
      url,
      links: [
        {
          label: "Facebook",
          href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
          label: "WhatsApp",
          href: `https://wa.me/?text=${encodedText}`,
        },
        {
          label: "Telegram",
          href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        },
        {
          label: "X",
          href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        },
        {
          label: "Email",
          href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
        },
      ],
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareData().url)
      setCopied(true)
      setIsOpen(false)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  function openShareLink(href: string) {
    window.open(href, "_blank", "noopener,noreferrer")
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Share listing"
        aria-expanded={isOpen}
        title={copied ? "Link copied" : "Share listing"}
        className={`inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 ${className}`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="m5 12 4 4L19 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M8.5 12.7 15.5 16.8M15.5 7.2 8.5 11.3M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-sm font-bold text-slate-700 shadow-xl">
          {getShareData().links.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => openShareLink(link.href)}
              className="block w-full px-4 py-2.5 text-left transition hover:bg-blue-50 hover:text-[#005BFF]"
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="block w-full border-t border-slate-100 px-4 py-2.5 text-left transition hover:bg-blue-50 hover:text-[#005BFF]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  )
}
