// Password input with a built-in show/hide eye toggle on the right.
// Mirrors the existing input styling shape so it drops in as a replacement
// anywhere we currently render <input type="password" />.
//
// Usage:
//   <PasswordInput value={pw} onChange={setPw} autoComplete="current-password" />
//
// Pass `style` to override the wrapper width or padding — the eye button
// sits inside the input's right edge so the visible width is unchanged.

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { tokens as t } from '../../styles.js'

export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  autoFocus = false,
  onKeyDown,
  style,
  inputStyle,
  disabled = false,
}) {
  const [shown, setShown] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        disabled={disabled}
        style={{
          width: '100%',
          background: t.color.bg,
          border: `1px solid ${t.color.line2}`,
          borderRadius: t.radius.md,
          fontSize: 16,                     // 16+ avoids iOS zoom-on-focus
          color: t.color.text,
          fontFamily: t.font.sans,
          outline: 'none',
          boxSizing: 'border-box',
          letterSpacing: shown ? 0 : 2,
          ...inputStyle,
          // Right padding MUST win to leave room for the eye toggle —
          // override any padding the caller passed via inputStyle.
          padding: '14px 46px 14px 16px',
          marginBottom: 0,                  // wrapper handles spacing
        }}
      />
      <button
        type="button"
        onClick={() => setShown(s => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: shown ? t.color.text : t.color.textDim,
          cursor: 'pointer',
          padding: 0,
          borderRadius: 8,
          transition: `color ${t.motion.fast}`,
        }}
      >
        {shown ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
      </button>
    </div>
  )
}
