import { getSupabaseClient } from './supabase'

export type ReportType = 'Bug' | 'Kritik' | 'Saran'
export type ReportStatus = 'baru' | 'diproses' | 'selesai'

export interface UserReport {
  id: string
  username: string
  type: ReportType
  page?: string
  message: string
  status: ReportStatus
  admin_reply?: string
  replied_at?: string
  created_at: string
}

const LOCAL_REPORTS_KEY = 'kalkulator-duitmu:user_reports'

function readLocalReports(): UserReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalReports(reports: UserReport[]): void {
  try {
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports))
  } catch {
    // abaikan kesalahan storage
  }
}

export async function sendUserReport(report: {
  username: string
  type: ReportType
  page?: string
  message: string
}): Promise<string | null> {
  const text = report.message.trim()
  if (!text) return 'Pesan laporan belum diisi.'

  const nowIso = new Date().toISOString()
  const tempId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const newReport: UserReport = {
    id: tempId,
    username: report.username.trim() || 'Anonim',
    type: report.type,
    page: report.page?.trim() || undefined,
    message: text,
    status: 'baru',
    created_at: nowIso,
  }

  // 1. Coba simpan ke Supabase jika terhubung
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          id: newReport.id,
          username: newReport.username,
          type: newReport.type,
          page: newReport.page,
          message: newReport.message,
          status: newReport.status,
          created_at: newReport.created_at,
        })
        .select('id')
        .maybeSingle()

      if (!error && data?.id) {
        newReport.id = String(data.id)
      }
    } catch (err) {
      console.warn('Gagal menyimpan laporan ke Supabase, fallback ke lokal:', err)
    }
  }

  // 2. Simpan juga ke cache lokal
  const localList = readLocalReports()
  localList.unshift(newReport)
  writeLocalReports(localList)

  return null
}

export async function fetchUserReports(): Promise<UserReport[]> {
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('id, username, type, page, message, status, admin_reply, replied_at, created_at')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data.map((item) => ({
          id: String(item.id),
          username: item.username || 'Anonim',
          type: (item.type || 'Saran') as ReportType,
          page: item.page || undefined,
          message: item.message || '',
          status: (item.status || 'baru') as ReportStatus,
          admin_reply: item.admin_reply || undefined,
          replied_at: item.replied_at || undefined,
          created_at: item.created_at || new Date().toISOString(),
        }))
      }
    } catch (err) {
      console.warn('Gagal mengambil laporan dari Supabase:', err)
    }
  }

  return readLocalReports()
}

export async function updateUserReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<string | null> {
  // 1. Selalu perbarui lokal terlebih dahulu
  const localList = readLocalReports()
  const idx = localList.findIndex((r) => r.id === reportId)
  if (idx >= 0) {
    localList[idx].status = status
    writeLocalReports(localList)
  }

  // 2. Coba perbarui di Supabase jika aktif
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({ status })
        .eq('id', reportId)

      if (error) {
        console.warn('Gagal sinkronisasi status ke Supabase:', error.message)
        return error.message
      }
    } catch (err) {
      return String(err)
    }
  }

  return null
}

export async function replyUserReport(
  reportId: string,
  replyText: string,
  nextStatus?: ReportStatus,
): Promise<string | null> {
  const text = replyText.trim()
  if (!text) return 'Pesan balasan belum diisi.'

  const nowIso = new Date().toISOString()

  // 1. Perbarui lokal
  const localList = readLocalReports()
  const idx = localList.findIndex((r) => r.id === reportId)
  if (idx >= 0) {
    localList[idx].admin_reply = text
    localList[idx].replied_at = nowIso
    if (nextStatus) {
      localList[idx].status = nextStatus
    }
    writeLocalReports(localList)
  }

  // 2. Perbarui Supabase
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {
        admin_reply: text,
        replied_at: nowIso,
      }
      if (nextStatus) {
        payload.status = nextStatus
      }

      const { error } = await supabase
        .from('user_reports')
        .update(payload)
        .eq('id', reportId)

      if (error) {
        console.warn('Gagal menyimpan balasan admin ke Supabase:', error.message)
        return error.message
      }
    } catch (err) {
      return String(err)
    }
  }

  return null
}

export async function deleteUserReport(reportId: string): Promise<string | null> {
  // 1. Hapus dari penyimpanan lokal
  const localList = readLocalReports()
  const remaining = localList.filter((r) => r.id !== reportId)
  writeLocalReports(remaining)

  // 2. Coba hapus dari Supabase
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('user_reports')
        .delete()
        .eq('id', reportId)

      if (error) {
        console.warn('Gagal menghapus dari Supabase:', error.message)
      }
    } catch (err) {
      console.warn('Gagal menghapus laporan dari Supabase:', err)
    }
  }

  return null
}
