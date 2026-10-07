import { getSupabaseClient } from './supabase'
import { sanitize } from './storage'
import type { AppState } from '../types'

export interface CloudSyncResult {
  success: boolean
  error?: string
  state?: AppState
  updatedAt?: string
}

export async function pushStateToCloud(username: string, state: AppState): Promise<CloudSyncResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: 'Layanan cloud tidak terhubung' }
  }

  const cleanName = username.trim()
  if (!cleanName) {
    return { success: false, error: 'Nama pengguna tidak valid' }
  }

  try {
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('user_data')
      .upsert(
        {
          username: cleanName,
          data: state,
          updated_at: nowIso,
        },
        { onConflict: 'username' },
      )

    if (error) {
      console.warn('Gagal sinkronisasi data ke cloud:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, updatedAt: nowIso }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan jaringan'
    return { success: false, error: msg }
  }
}

export async function pullStateFromCloud(username: string): Promise<CloudSyncResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { success: false, error: 'Layanan cloud tidak terhubung' }
  }

  const cleanName = username.trim()
  if (!cleanName) {
    return { success: false, error: 'Nama pengguna tidak valid' }
  }

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .ilike('username', cleanName)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data || !data.data) {
      return { success: false, error: 'Belum ada data di cloud untuk akun ini' }
    }

    const sanitized = sanitize(data.data)
    return {
      success: true,
      state: sanitized,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan jaringan'
    return { success: false, error: msg }
  }
}
