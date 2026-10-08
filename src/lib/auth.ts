import { getSupabaseClient } from './supabase'

const ACCOUNTS_KEY = 'kalkulator-duitmu:accounts'
const SESSION_KEY = 'kalkulator-duitmu:session'
const SESSION_ROLE_KEY = 'kalkulator-duitmu:session_role'

export interface Account {
  username: string
  salt: string
  hash: string
  role?: 'admin' | 'user'
  created_at?: string
  last_login?: string
}

export interface RegisteredUserInfo {
  username: string
  role: 'admin' | 'user'
  created_at: string
  last_login: string
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((item): item is Account => {
      if (!item || typeof item !== 'object') return false
      const account = item as Record<string, unknown>
      return (
        typeof account.username === 'string' &&
        typeof account.salt === 'string' &&
        typeof account.hash === 'string'
      )
    })
  } catch {
    return []
  }
}

function writeAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // storage penuh/di-block: akun tidak tersimpan
  }
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const text = `${salt}:${password}`
  if (!globalThis.crypto?.subtle) {
    let hash = 0x811c9dc5
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return `fnv:${(hash >>> 0).toString(16)}`
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `sha256:${hex}`
}

function migrateLegacy(username: string): void {
  const moves: [string, string][] = [
    ['kalkulator-duitmu:v1', `kalkulator-duitmu:v1:${username}`],
    ['kalkulator-duitmu:prefs', `kalkulator-duitmu:prefs:${username}`],
  ]
  for (const [from, to] of moves) {
    try {
      const raw = localStorage.getItem(from)
      if (raw !== null && localStorage.getItem(to) === null) {
        localStorage.setItem(to, raw)
        localStorage.removeItem(from)
      }
    } catch {
      // storage bermasalah: data lama dibiarkan, tidak menghalangi pendaftaran
    }
  }
}

export function hasAccounts(): boolean {
  return readAccounts().length > 0
}

export function accountNames(): string[] {
  return readAccounts().map((account) => account.username)
}

export function currentUser(): string | null {
  try {
    const name = sessionStorage.getItem(SESSION_KEY)
    return name && name.trim() !== '' ? name : null
  } catch {
    return null
  }
}

export function currentUserRole(): 'admin' | 'user' {
  try {
    const current = currentUser()?.toLowerCase()
    if (!current) return 'user'

    // Hanya akun pemilik yang mendapatkan peran admin
    const adminEnv = (import.meta.env?.VITE_ADMIN_USERNAME as string | undefined)?.trim().toLowerCase()
    const isOwner = current === 'shukoh#dev' || (adminEnv && current === adminEnv)
    if (isOwner) return 'admin'

    return 'user'
  } catch {
    return 'user'
  }
}

export function isAdmin(): boolean {
  return currentUserRole() === 'admin'
}

export async function register(username: string, password: string): Promise<string | null> {
  const name = username.trim()
  if (name === '') return 'Nama pengguna belum diisi.'
  if (name.length > 24) return 'Nama pengguna maksimal 24 karakter.'
  if (password.length < 4) return 'Kata sandi minimal 4 karakter.'

  const accounts = readAccounts()
  if (accounts.some((account) => account.username.toLowerCase() === name.toLowerCase())) {
    return 'Nama pengguna sudah dipakai. Pilih nama lain.'
  }

  const salt = randomSalt()
  const hash = await hashPassword(password, salt)
  const firstAccount = accounts.length === 0
  const nowIso = new Date().toISOString()

  // Hanya pemilik yang mendapatkan peran admin, pengguna baru lainnya selalu 'user':
  const adminEnv = (import.meta.env?.VITE_ADMIN_USERNAME as string | undefined)?.trim().toLowerCase()
  const isOwner = name.toLowerCase() === 'shukoh#dev' || (adminEnv && name.toLowerCase() === adminEnv)
  const role: 'admin' | 'user' = isOwner ? 'admin' : 'user'

  // Coba simpan ke Supabase jika terkonfigurasi
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('app_users')
        .select('username')
        .ilike('username', name)
        .maybeSingle()

      if (existing) {
        return 'Nama pengguna sudah dipakai di server. Pilih nama lain.'
      }

      const { error } = await supabase
        .from('app_users')
        .insert({
          username: name,
          salt,
          hash,
          role,
          created_at: nowIso,
          last_login: nowIso,
        })

      if (error) {
        console.warn('Gagal menyimpan ke Supabase:', error.message)
      }
    } catch (err) {
      console.warn('Koneksi Supabase bermasalah:', err)
    }
  }

  accounts.push({ username: name, salt, hash, role, created_at: nowIso, last_login: nowIso })
  writeAccounts(accounts)
  if (firstAccount) migrateLegacy(name)

  try {
    sessionStorage.setItem(SESSION_KEY, name)
    sessionStorage.setItem(SESSION_ROLE_KEY, role)
  } catch {
    // sessionStorage diblokir
  }
  return null
}

export async function login(username: string, password: string): Promise<string | null> {
  const name = username.trim()
  const supabase = getSupabaseClient()

  // 1. Cek Supabase jika aktif
  if (supabase) {
    try {
      const { data: remoteUser, error } = await supabase
        .from('app_users')
        .select('username, salt, hash, role')
        .ilike('username', name)
        .maybeSingle()

      if (!error && remoteUser) {
        const hash = await hashPassword(password, remoteUser.salt)
        if (hash !== remoteUser.hash) {
          return 'Kata sandi salah.'
        }

        const nowIso = new Date().toISOString()
        const adminEnv = (import.meta.env?.VITE_ADMIN_USERNAME as string | undefined)?.trim().toLowerCase()
        const isOwner = remoteUser.username.toLowerCase() === 'shukoh#dev' || (adminEnv && remoteUser.username.toLowerCase() === adminEnv)
        const userRole: 'admin' | 'user' = isOwner ? 'admin' : 'user'

        // Perbarui last_login di Supabase secara asinkron
        supabase
          .from('app_users')
          .update({ last_login: nowIso })
          .ilike('username', remoteUser.username)
          .then()

        // Sinkronkan ke local storage
        const accounts = readAccounts()
        const localIdx = accounts.findIndex((a) => a.username.toLowerCase() === remoteUser.username.toLowerCase())
        if (localIdx >= 0) {
          accounts[localIdx] = {
            ...accounts[localIdx],
            salt: remoteUser.salt,
            hash: remoteUser.hash,
            role: userRole,
            last_login: nowIso,
          }
        } else {
          accounts.push({
            username: remoteUser.username,
            salt: remoteUser.salt,
            hash: remoteUser.hash,
            role: userRole,
            created_at: nowIso,
            last_login: nowIso,
          })
        }
        writeAccounts(accounts)

        try {
          sessionStorage.setItem(SESSION_KEY, remoteUser.username)
          sessionStorage.setItem(SESSION_ROLE_KEY, userRole)
        } catch {
          // ignore
        }
        return null
      }
    } catch (err) {
      console.warn('Fallback ke login lokal karena koneksi server:', err)
    }
  }

  // 2. Fallback login lokal
  const account = readAccounts().find(
    (item) => item.username.toLowerCase() === name.toLowerCase(),
  )
  if (!account) return 'Akun tidak ditemukan. Daftar dulu ya.'
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.hash) return 'Kata sandi salah.'

  const adminEnv = (import.meta.env?.VITE_ADMIN_USERNAME as string | undefined)?.trim().toLowerCase()
  const isOwner = name.toLowerCase() === 'shukoh#dev' || (adminEnv && name.toLowerCase() === adminEnv)
  const userRole: 'admin' | 'user' = isOwner ? 'admin' : 'user'

  // Sinkronkan ke Supabase jika belum terdaftar di remote
  if (supabase) {
    const nowIso = new Date().toISOString()
    supabase
      .from('app_users')
      .upsert({
        username: account.username,
        salt: account.salt,
        hash: account.hash,
        role: userRole,
        created_at: account.created_at || nowIso,
        last_login: nowIso,
      })
      .then()
  }

  try {
    sessionStorage.setItem(SESSION_KEY, account.username)
    sessionStorage.setItem(SESSION_ROLE_KEY, userRole)
  } catch {
    // sessionStorage diblokir
  }
  return null
}

export function logout(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_ROLE_KEY)
  } catch {
    // no-op
  }
}

export async function fetchRegisteredUsers(): Promise<RegisteredUserInfo[]> {
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('username, role, created_at, last_login')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data.map((item) => ({
          username: item.username,
          role: (item.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          created_at: item.created_at || new Date().toISOString(),
          last_login: item.last_login || new Date().toISOString(),
        }))
      }
    } catch (err) {
      console.warn('Gagal mengambil daftar pengguna dari Supabase:', err)
    }
  }

  // Fallback lokal
  const accounts = readAccounts()
  return accounts.map((acc) => ({
    username: acc.username,
    role: (acc.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
    created_at: acc.created_at || new Date().toISOString(),
    last_login: acc.last_login || new Date().toISOString(),
  }))
}

export async function updateRemoteUserRole(username: string, role: 'admin' | 'user'): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ role })
        .ilike('username', username)

      if (error) return error.message
    } catch (err) {
      return String(err)
    }
  }

  // Update akun lokal juga
  const accounts = readAccounts()
  const target = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase())
  if (target) {
    target.role = role
    writeAccounts(accounts)
  }
  return null
}

export async function changePassword(
  username: string,
  oldPass: string,
  newPass: string,
): Promise<string | null> {
  const name = username.trim()
  if (!name) return 'Nama pengguna tidak valid.'
  if (newPass.length < 4) return 'Kata sandi baru minimal 4 karakter.'

  const supabase = getSupabaseClient()
  const accounts = readAccounts()
  const localAccount = accounts.find((a) => a.username.toLowerCase() === name.toLowerCase())

  if (supabase) {
    try {
      const { data: remoteUser, error } = await supabase
        .from('app_users')
        .select('username, salt, hash')
        .ilike('username', name)
        .maybeSingle()

      if (!error && remoteUser) {
        const oldHash = await hashPassword(oldPass, remoteUser.salt)
        if (oldHash !== remoteUser.hash) {
          return 'Kata sandi lama tidak sesuai.'
        }

        const newSalt = randomSalt()
        const newHash = await hashPassword(newPass, newSalt)

        const { error: updateErr } = await supabase
          .from('app_users')
          .update({ salt: newSalt, hash: newHash })
          .ilike('username', remoteUser.username)

        if (updateErr) {
          return `Gagal memperbarui di server: ${updateErr.message}`
        }

        if (localAccount) {
          localAccount.salt = newSalt
          localAccount.hash = newHash
          writeAccounts(accounts)
        } else {
          accounts.push({
            username: remoteUser.username,
            salt: newSalt,
            hash: newHash,
            role: 'user',
          })
          writeAccounts(accounts)
        }
        return null
      }
    } catch (err) {
      console.warn('Gagal verifikasi kata sandi di Supabase:', err)
    }
  }

  if (!localAccount) return 'Akun tidak ditemukan.'
  const oldHash = await hashPassword(oldPass, localAccount.salt)
  if (oldHash !== localAccount.hash) {
    return 'Kata sandi lama tidak sesuai.'
  }

  const newSalt = randomSalt()
  const newHash = await hashPassword(newPass, newSalt)
  localAccount.salt = newSalt
  localAccount.hash = newHash
  writeAccounts(accounts)
  return null
}

