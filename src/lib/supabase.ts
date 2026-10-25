import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'kalkulator-duitmu:supabase_config'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

const DEFAULT_SUPABASE_URL = 'https://xnbtiskribahrsvahfuz.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYnRpc2tyaWJhaHJzdmFoZnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODI3NjIsImV4cCI6MjEwNjk1ODc2Mn0.htxJa9veUiKnlXtUgPPj0y9QIH6WNiXnQhpOBMq0hTk'

export function getSupabaseConfig(): SupabaseConfig {
  if (import.meta.env?.MODE === 'test') {
    return { url: '', anonKey: '' }
  }

  const envUrl = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
  const envKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey }
  }

  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConfig>
      if (typeof parsed.url === 'string' && typeof parsed.anonKey === 'string' && parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() }
      }
    }
  } catch {
    // abaikan kesalahan storage
  }

  // Gunakan kredensial cloud default agar sinkronisasi akun antar-deployment otomatis
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY }
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }))
    cachedClient = null
  } catch {
    // abaikan kesalahan storage
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY)
    cachedClient = null
  } catch {
    // abaikan kesalahan storage
  }
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient
  const config = getSupabaseConfig()
  if (!config.url || !config.anonKey) return null

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    return cachedClient
  } catch {
    return null
  }
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig()
  return Boolean(config.url && config.anonKey)
}
