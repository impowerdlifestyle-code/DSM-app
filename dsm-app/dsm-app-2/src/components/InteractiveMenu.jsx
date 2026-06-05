// Premium animated bottom nav — icon + label pair with a width-animating
// underline that grows under the active item's text. Self-contains its CSS
// so the rest of the app stays inline-style-driven.
//
// Adapted from a TypeScript reference component. Tailored to DSM's glass
// + 3D depth language and wired to accept theme tokens via CSS variables.
import { useState, useRef, useEffect, useMemo } from 'react'

const DEFAULT_ACCENT = 'var(--component-active-color-default, #4ade80)'

export default function InteractiveMenu({
  items,
  accentColor,
  activeIndex,
  onChange,
}) {
  const finalItems = useMemo(() => {
    const ok = items && Array.isArray(items) && items.length >= 2 && items.length <= 6
    if (!ok) {
      console.warn('InteractiveMenu: items prop invalid', items)
      return []
    }
    return items
  }, [items])

  // Allow controlled (activeIndex prop) or uncontrolled use.
  const [internal, setInternal] = useState(0)
  const idx = typeof activeIndex === 'number' ? activeIndex : internal
  const setIdx = (i) => {
    if (typeof activeIndex !== 'number') setInternal(i)
    onChange?.(i, finalItems[i])
  }

  useEffect(() => {
    if (idx >= finalItems.length) setIdx(0)
  }, [finalItems])

  const textRefs = useRef([])
  const itemRefs = useRef([])

  useEffect(() => {
    const setLineWidth = () => {
      const activeItem = itemRefs.current[idx]
      const activeText = textRefs.current[idx]
      if (activeItem && activeText) {
        const w = activeText.offsetWidth
        activeItem.style.setProperty('--lineWidth', `${w}px`)
      }
    }
    setLineWidth()
    window.addEventListener('resize', setLineWidth)
    return () => window.removeEventListener('resize', setLineWidth)
  }, [idx, finalItems])

  const navStyle = useMemo(() => ({
    '--component-active-color': accentColor || DEFAULT_ACCENT,
  }), [accentColor])

  if (!finalItems.length) return null

  return (
    <>
      <style>{MENU_CSS}</style>
      <nav className="dsm-menu" role="navigation" style={navStyle}>
        {finalItems.map((item, i) => {
          const Icon = item.icon
          const active = i === idx
          return (
            <button
              key={item.label + i}
              type="button"
              className={`dsm-menu__item ${active ? 'is-active' : ''}`}
              onClick={() => setIdx(i)}
              ref={(el) => { itemRefs.current[i] = el }}
              style={{ '--lineWidth': '0px' }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="dsm-menu__icon">
                {Icon ? <Icon className="dsm-icon" size={20} /> : null}
              </span>
              <strong
                className={`dsm-menu__text ${active ? 'is-active' : ''}`}
                ref={(el) => { textRefs.current[i] = el }}
              >
                {item.label}
              </strong>
            </button>
          )
        })}
      </nav>
    </>
  )
}

// Premium glass nav with multi-layer 3D borders, depth, and an animated
// underline that grows under the active label. Uses CSS custom properties
// so theme switching just swaps the colors.
const MENU_CSS = `
.dsm-menu {
  --component-active-color-default: var(--color-pitch, #4ade80);
  position: fixed;
  bottom: max(14px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 28px);
  max-width: 412px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(22,22,24,0.86) 0%, rgba(8,8,10,0.94) 100%);
  border: 1px solid rgba(255,255,255,0.10);
  border-top-color: rgba(255,255,255,0.18);
  border-bottom-color: rgba(0,0,0,0.55);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
          backdrop-filter: blur(28px) saturate(180%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.10),
    inset 0 -1px 0 rgba(0,0,0,0.45),
    0 1px 0 rgba(255,255,255,0.04),
    0 18px 44px -16px rgba(0,0,0,0.85),
    0 32px 80px -32px rgba(0,0,0,0.65);
}

.dsm-menu__item {
  flex: 1;
  min-height: 48px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  color: #8a8b8f;
  font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
  transition:
    color 220ms cubic-bezier(.2,.7,.2,1),
    background 220ms cubic-bezier(.2,.7,.2,1),
    border-color 220ms cubic-bezier(.2,.7,.2,1),
    box-shadow 220ms cubic-bezier(.2,.7,.2,1),
    transform 120ms cubic-bezier(.2,.7,.2,1);
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.dsm-menu__item:active {
  transform: scale(0.96);
}

.dsm-menu__item.is-active {
  color: var(--component-active-color);
  background: linear-gradient(180deg, rgba(74,222,128,0.16) 0%, rgba(74,222,128,0.05) 100%);
  border-color: rgba(74,222,128,0.30);
  box-shadow:
    inset 1.5px 1.5px 1px -1.5px rgba(255,255,255,0.9),
    inset -1.5px -1.5px 1px -1.5px rgba(255,255,255,0.5),
    inset 0 1px 1px -0.5px rgba(255,255,255,0.5),
    0 4px 14px -6px rgba(74,222,128,0.6),
    0 0 12px -2px rgba(74,222,128,0.4),
    0 1px 0 rgba(0,0,0,0.4);
}

.dsm-menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: inherit;
  filter: drop-shadow(0 1px 0 rgba(0,0,0,0.35));
}

.dsm-menu__icon .dsm-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.75;
}

.dsm-menu__text {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: inherit;
  opacity: 0.55;
  transition: opacity 220ms cubic-bezier(.2,.7,.2,1);
  white-space: nowrap;
}

.dsm-menu__text.is-active {
  opacity: 1;
}

/* Animated underline: width grows to match active text width via --lineWidth */
.dsm-menu__item::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 50%;
  height: 2px;
  width: 0;
  border-radius: 1px;
  background: var(--component-active-color);
  box-shadow:
    0 0 8px var(--component-active-color),
    0 0 18px color-mix(in srgb, var(--component-active-color) 40%, transparent);
  transform: translateX(-50%);
  transition: width 280ms cubic-bezier(.2,.7,.2,1), opacity 220ms ease;
  opacity: 0;
}

.dsm-menu__item.is-active::after {
  width: var(--lineWidth, 22px);
  opacity: 1;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .dsm-menu__item,
  .dsm-menu__item::after,
  .dsm-menu__text {
    transition: none !important;
  }
}
`
