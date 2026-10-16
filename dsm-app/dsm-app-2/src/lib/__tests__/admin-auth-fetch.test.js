import { beforeEach, describe, expect, it, vi } from 'vitest'

const authFetch = vi.hoisted(() => vi.fn())

vi.mock('../authFetch.js', () => ({
  authFetch,
}))

describe('admin athlete API calls', () => {
  beforeEach(() => {
    authFetch.mockReset()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('adminDeleteAthlete loads authFetch and posts the athlete id', async () => {
    authFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    const { adminDeleteAthlete } = await import('../supabase.js')
    const result = await adminDeleteAthlete('athlete-1')
    expect(result).toEqual({ error: null })
    expect(authFetch).toHaveBeenCalledWith('/api/admin-delete-athlete', {
      method: 'POST',
      body: JSON.stringify({ athleteId: 'athlete-1' }),
    })
  })

  it('adminDeleteAthlete returns the server error instead of throwing', async () => {
    authFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Not allowed' }),
    })
    const { adminDeleteAthlete } = await import('../supabase.js')
    const result = await adminDeleteAthlete('athlete-1')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.message).toBe('Not allowed')
  })

  it('adminCreateAthlete loads authFetch and posts the roster payload', async () => {
    authFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'new-athlete' }),
    })
    const { adminCreateAthlete } = await import('../supabase.js')
    const payload = {
      email: 'kid@example.com',
      name: 'Kid',
      password: 'secret',
      age: 12,
      assignedCoach: 'coach-1',
    }
    const result = await adminCreateAthlete(payload)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: 'new-athlete' })
    expect(authFetch).toHaveBeenCalledWith('/api/admin-create-athlete', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
})
