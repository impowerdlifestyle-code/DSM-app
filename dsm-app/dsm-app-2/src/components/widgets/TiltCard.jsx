import { useRef, useState, useCallback } from 'react'

/**
 * TiltCard — 3D-tilt card with cursor-following spotlight + metallic
 * silver-to-white gradient ring on the border.
 *
 * Props:
 *   tiltLimit     — max tilt angle in degrees (default 12)
 *   scale         — hover scale factor (default 1.03)
 *   perspective   — perspective distance in px (default 1200)
 *   effect        — "gravitate" (follows cursor) or "evade" (tilts away)
 *   spotlight     — show cursor-following radial light (default true)
 *   shine         — metallic gradient ring on the edge (default true)
 *   className     — pass-through class
 *   style         — pass-through inline style merged with the transform
 *   children
 */
export default function TiltCard({
  tiltLimit = 12,
  scale = 1.03,
  perspective = 1200,
  effect = 'evade',
  spotlight = true,
  shine = true,
  className,
  style,
  children,
}) {
  const cardRef = useRef(null)
  const [transform, setTransform] = useState(
    `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
  )
  const [spotPos, setSpotPos] = useState({ x: 50, y: 50 })
  const [shineAngle, setShineAngle] = useState(135)
  const [hovered, setHovered] = useState(false)

  const dir = effect === 'evade' ? -1 : 1

  const handleMove = useCallback(
    (e) => {
      const el = cardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const xRot = (py - 0.5) * (tiltLimit * 2) * dir
      const yRot = (px - 0.5) * -(tiltLimit * 2) * dir
      setTransform(
        `perspective(${perspective}px) rotateX(${xRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      )
      if (spotlight) setSpotPos({ x: px * 100, y: py * 100 })
      if (shine) {
        // angle from card center to cursor — drives the gradient orientation
        const angle = Math.atan2(py - 0.5, px - 0.5) * (180 / Math.PI) + 90
        setShineAngle(angle)
      }
    },
    [tiltLimit, scale, perspective, dir, spotlight, shine]
  )

  const handleEnter = useCallback(() => setHovered(true), [])
  const handleLeave = useCallback(() => {
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`)
    setHovered(false)
    setShineAngle(135)
  }, [perspective])

  // Silver / white gradient that brightens on hover
  const shineGradient = hovered
    ? `linear-gradient(${shineAngle.toFixed(0)}deg, rgba(255,255,255,0.7) 0%, rgba(220,220,225,0.35) 25%, rgba(255,255,255,0.85) 50%, rgba(190,190,200,0.30) 75%, rgba(255,255,255,0.65) 100%)`
    : `linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(180,180,190,0.10) 35%, rgba(255,255,255,0.28) 60%, rgba(160,160,170,0.10) 85%, rgba(255,255,255,0.22) 100%)`

  return (
    <div
      ref={cardRef}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        transition: 'transform 200ms ease-out',
        ...style,
        transform,
      }}
    >
      {children}

      {/* Metallic shine ring — uses CSS mask to paint a 1px gradient frame only */}
      {shine && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 11,
            pointerEvents: 'none',
            borderRadius: 'inherit',
            padding: 1,
            background: shineGradient,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
            transition: 'background 220ms cubic-bezier(.2,.7,.2,1)',
          }}
        />
      )}

      {/* Cursor-follow radial spotlight */}
      {spotlight && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 300ms',
            borderRadius: 'inherit',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '200%',
              height: '200%',
              borderRadius: '50%',
              left: `${spotPos.x}%`,
              top: `${spotPos.y}%`,
              transform: 'translate(-50%, -50%)',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 40%)',
            }}
          />
        </div>
      )}
    </div>
  )
}
