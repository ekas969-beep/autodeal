"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type PanPosition = {
  x: number
  y: number
}

type GalleryListing = {
  title?: string | null
}

const EDGE_SWITCH_WHEEL_DISTANCE = 45
const EDGE_RESISTANCE = 80
const WHEEL_SWITCH_COOLDOWN_MS = 350
const DOUBLE_TAP_DELAY_MS = 320
const TAP_MOVE_TOLERANCE = 10

export default function CarGallery({
  images,
  listing,
}: {
  images: string[]
  listing?: GalleryListing
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 })
  const pointerStartRef = useRef({ x: 0, y: 0 })
  const startedOnBackdropRef = useRef(false)
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 })
  const wheelSwipeRef = useRef({ delta: 0, locked: false })
  const wheelResetRef = useRef<number | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const activeImage = images[activeIndex]
  const canNavigate = images.length > 1
  const isZoomed = zoom > 1

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDragging(false)
  }, [])

  const setPhoto = useCallback((index: number) => {
    setActiveIndex((index + images.length) % images.length)
    resetZoom()
  }, [images.length, resetZoom])

  const goNext = useCallback(() => {
    setPhoto(activeIndex + 1)
  }, [activeIndex, setPhoto])

  const goPrevious = useCallback(() => {
    setPhoto(activeIndex - 1)
  }, [activeIndex, setPhoto])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
      if (event.key === "ArrowLeft") goPrevious()
      if (event.key === "ArrowRight") goNext()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
      if (wheelResetRef.current) {
        window.clearTimeout(wheelResetRef.current)
        wheelResetRef.current = null
      }
    }
  }, [goNext, goPrevious, isOpen])

  if (!images || images.length === 0) return null

  function openGallery(index: number) {
    setPhoto(index)
    setIsOpen(true)
  }

  function changeZoom(nextZoom: number) {
    const clampedZoom = Math.min(4, Math.max(1, nextZoom))
    setZoom(clampedZoom)

    if (clampedZoom === 1) {
      setPan({ x: 0, y: 0 })
      setDragging(false)
    } else {
      setPan((current) => clampPan(current, clampedZoom))
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!isOpen) return

    const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX
    const isHorizontalSwipe =
      canNavigate &&
      Math.abs(horizontalDelta) > 0 &&
      (Math.abs(horizontalDelta) >= Math.abs(event.deltaY) * 0.55 || event.shiftKey)

    if (isHorizontalSwipe) {
      handleWheelSwipe(horizontalDelta)
      return
    }

    changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2))
  }

  function handleWheelSwipe(delta: number) {
    if (wheelSwipeRef.current.locked) return

    wheelSwipeRef.current.delta += delta

    if (wheelResetRef.current) {
      window.clearTimeout(wheelResetRef.current)
    }

    wheelResetRef.current = window.setTimeout(() => {
      wheelSwipeRef.current.delta = 0
      wheelResetRef.current = null
    }, 180)

    if (Math.abs(wheelSwipeRef.current.delta) < EDGE_SWITCH_WHEEL_DISTANCE) return

    if (wheelSwipeRef.current.delta > 0) {
      goNext()
    } else {
      goPrevious()
    }

    wheelSwipeRef.current.delta = 0
    wheelSwipeRef.current.locked = true

    window.setTimeout(() => {
      wheelSwipeRef.current.locked = false
    }, WHEEL_SWITCH_COOLDOWN_MS)
  }

  function toggleZoom() {
    if (isZoomed) {
      resetZoom()
      return
    }

    changeZoom(2.25)
    setPan({ x: 0, y: 0 })
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    startedOnBackdropRef.current = event.target === event.currentTarget
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }

    if (isZoomed) {
      setDragging(true)
    }
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !isZoomed) return

    const start = dragStartRef.current
    const nextPan = {
      x: start.panX + event.clientX - start.pointerX,
      y: start.panY + event.clientY - start.pointerY,
    }
    const bounds = getPanBounds()

    setPan({
      x: resistPan(nextPan.x, bounds.x),
      y: clamp(nextPan.y, -bounds.y, bounds.y),
    })
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    const movedDistance = Math.hypot(
      event.clientX - pointerStartRef.current.x,
      event.clientY - pointerStartRef.current.y
    )

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (movedDistance <= TAP_MOVE_TOLERANCE && startedOnBackdropRef.current) {
      setIsOpen(false)
      return
    }

    if (movedDistance <= TAP_MOVE_TOLERANCE) {
      handleTap(event.clientX, event.clientY)
    }

    if (!dragging) return

    setDragging(false)
    setPan((current) => clampPan(current))
  }

  function handleTap(x: number, y: number) {
    const now = window.performance.now()
    const previous = lastTapRef.current
    const distance = Math.hypot(x - previous.x, y - previous.y)

    if (now - previous.time <= DOUBLE_TAP_DELAY_MS && distance <= 48) {
      lastTapRef.current = { time: 0, x: 0, y: 0 }
      toggleZoom()
      return
    }

    lastTapRef.current = { time: now, x, y }
  }

  function getPanBounds(nextZoom = zoom) {
    const viewer = viewerRef.current
    const image = imageRef.current

    if (!viewer || !image) {
      return { x: 0, y: 0 }
    }

    const scaledWidth = image.offsetWidth * nextZoom
    const scaledHeight = image.offsetHeight * nextZoom

    return {
      x: Math.max(0, (scaledWidth - viewer.clientWidth) / 2),
      y: Math.max(0, (scaledHeight - viewer.clientHeight) / 2),
    }
  }

  function clampPan(value: PanPosition, nextZoom = zoom) {
    const bounds = getPanBounds(nextZoom)

    return {
      x: clamp(value.x, -bounds.x, bounds.x),
      y: clamp(value.y, -bounds.y, bounds.y),
    }
  }

  function resistPan(value: number, max: number) {
    if (Math.abs(value) <= max) return value

    const direction = Math.sign(value)
    const excess = Math.abs(value) - max

    return direction * (max + Math.min(EDGE_RESISTANCE, excess * 0.25))
  }

  return (
    <>
      <section className="min-w-0 overflow-hidden">
        <div className="group relative h-[240px] w-full overflow-hidden rounded-lg bg-slate-200 sm:h-[330px] lg:h-[410px]">
          <button
            type="button"
            onClick={() => openGallery(activeIndex)}
            className="block h-full w-full text-left"
          >
            <img
              src={activeImage}
              alt={listing?.title || `Vehicle photo ${activeIndex + 1}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            />
          </button>

          {canNavigate && (
            <>
              <GlassArrowButton
                direction="left"
                label="Previous photo"
                onClick={goPrevious}
                className="left-4"
              />
              <GlassArrowButton
                direction="right"
                label="Next photo"
                onClick={goNext}
                className="right-4"
              />
            </>
          )}

          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-sm font-black text-white backdrop-blur">
            {activeIndex + 1} / {images.length}
          </span>
        </div>

        <div
          className="mt-3 flex max-w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [-webkit-overflow-scrolling:touch]"
          aria-label="Vehicle photo thumbnails"
        >
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setPhoto(index)}
              onDoubleClick={() => openGallery(index)}
              className={`group relative h-14 w-[88px] shrink-0 snap-start overflow-hidden rounded-md bg-slate-200 text-left ring-inset transition sm:h-16 sm:w-28 lg:h-[72px] lg:w-32 ${
                index === activeIndex ? "ring-2 ring-[#005BFF]" : "ring-1 ring-slate-200"
              }`}
            >
              <img
                src={image}
                alt={`Vehicle photo ${index + 1}`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            </button>
          ))}
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl">
          <div className="absolute left-4 right-4 top-4 z-50 flex items-center justify-between gap-3 sm:left-6 sm:right-6">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-xl backdrop-blur-md">
              {activeIndex + 1} / {images.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeZoom(zoom - 0.25)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-xl backdrop-blur-md hover:bg-white/20"
              >
                − Zoom
              </button>
              <button
                type="button"
                onClick={() => changeZoom(zoom + 0.25)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-xl backdrop-blur-md hover:bg-white/20"
              >
                + Zoom
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-xl backdrop-blur-md hover:bg-white/20 sm:inline-flex"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xl leading-none text-white shadow-xl backdrop-blur-md hover:bg-white/20"
                aria-label="Close gallery"
              >
                x
              </button>
            </div>
          </div>

          {canNavigate && (
            <>
              <GlassArrowButton
                direction="left"
                label="Previous photo"
                onClick={goPrevious}
                className="left-4 z-50 sm:left-8"
                large
              />
              <GlassArrowButton
                direction="right"
                label="Next photo"
                onClick={goNext}
                className="right-4 z-50 sm:right-8"
                large
              />
            </>
          )}

          <div
            ref={viewerRef}
            onWheel={handleWheel}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className={`flex h-full items-center justify-center px-5 ${
              isZoomed
                ? "cursor-grab pb-8 pt-20 active:cursor-grabbing"
                : "pb-32 pt-20 sm:pb-36"
            } touch-none`}
          >
            <img
              ref={imageRef}
              src={activeImage}
              alt="Vehicle gallery preview"
              draggable={false}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              }}
              className={`max-h-full max-w-full select-none rounded-xl object-contain shadow-2xl ${
                dragging ? "" : "transition-transform duration-150"
              }`}
            />
          </div>

          {!isZoomed && (
            <div className="absolute bottom-5 left-1/2 z-50 max-w-[92vw] -translate-x-1/2 overflow-x-auto rounded-2xl border border-white/10 bg-black/45 p-2 shadow-2xl backdrop-blur-md">
              <div className="flex gap-2">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setPhoto(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition sm:h-20 sm:w-28 ${
                      index === activeIndex
                        ? "border-blue-400 ring-2 ring-blue-400"
                        : "border-white/20 hover:border-white/70"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Vehicle thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function GlassArrowButton({
  direction,
  label,
  onClick,
  className = "",
  large = false,
}: {
  direction: "left" | "right"
  label: string
  onClick: () => void
  className?: string
  large?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/20 text-white shadow-2xl backdrop-blur-md transition hover:bg-white/35 ${
        large ? "h-14 w-14 text-5xl" : "h-11 w-11 text-3xl"
      } ${className}`}
      aria-label={label}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
