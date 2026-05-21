/**
 * useTabHistory — browser-style history stack for tab-based nav.
 *
 * Replaces a raw setTab/tab pair with a stack + index so back/forward
 * work like Safari/Chrome. When you setTab to a new tab, anything ahead
 * in the stack gets dropped (same as browser nav).
 *
 * Returns:
 *   tab          — current tab id
 *   push(t)      — navigate to a new tab (drops forward history)
 *   back()       — pop one step
 *   forward()    — re-push next-in-stack
 *   canBack      — true if stack has more than just current
 *   canForward   — true if you've back'd at least once
 *   reset(t)     — clear history, start fresh at t
 */
import { useCallback, useRef, useState } from 'react'

export default function useTabHistory(initial = 'home') {
  const [stack, setStack] = useState([initial])
  const [idx, setIdx] = useState(0)
  const lastPush = useRef(0)

  const push = useCallback((next) => {
    if (!next || typeof next !== 'string') return
    setStack(prev => {
      const here = prev[idx]
      if (next === here) return prev
      // dedupe rapid double-pushes (some setTab calls trigger twice)
      const now = Date.now()
      if (now - lastPush.current < 50 && next === prev[prev.length - 1]) return prev
      lastPush.current = now
      const truncated = prev.slice(0, idx + 1)
      const merged = [...truncated, next]
      // cap stack depth so it doesn't grow forever
      return merged.length > 40 ? merged.slice(merged.length - 40) : merged
    })
    setIdx(i => Math.min(i + 1, 39))
  }, [idx])

  const back = useCallback(() => {
    setIdx(i => Math.max(0, i - 1))
  }, [])

  const forward = useCallback(() => {
    setIdx(i => Math.min(stack.length - 1, i + 1))
  }, [stack.length])

  const reset = useCallback((next) => {
    setStack([next || 'home'])
    setIdx(0)
  }, [])

  return {
    tab: stack[idx],
    push,
    back,
    forward,
    canBack: idx > 0,
    canForward: idx < stack.length - 1,
    reset,
    depth: stack.length,
    index: idx,
  }
}
