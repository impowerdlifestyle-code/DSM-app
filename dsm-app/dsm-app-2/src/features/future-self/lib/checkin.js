import { supabase } from '../../../lib/supabase.js'

// 'YYYY-MM' — the schema key used for the once-per-month uniqueness constraint
export function getCurrentMonth(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Returns the current month's check-in row for an athlete, or null.
export async function getMonthlyCheckin(userId, month = getCurrentMonth()) {
  if (!userId) return { data: null, error: new Error('userId required') }
  const { data, error } = await supabase
    .from('future_self_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()
  return { data, error }
}
