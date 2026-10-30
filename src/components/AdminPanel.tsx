import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  fetchRegisteredUsers,
  updateRemoteUserRole,
  type RegisteredUserInfo,
} from '../lib/auth'
import {
  getSupabaseConfig,
  setSupabaseConfig,
  isSupabaseConfigured,
  getSupabaseClient,
} from '../lib/supabase'
import {
  fetchUserReports,
  updateUserReportStatus,
  replyUserReport,
  deleteUserReport,
  type UserReport,
  type ReportStatus,
} from '../lib/reports'
import type { Notify } from '../types'
import { useI18n } from '../lib/i18n'
import { CustomSelect } from './CustomSelect'

interface Props {
  currentUser: string
  notify?: Notify
}

export function AdminPanel({ currentUser, notify }: Props) {
  const { language } = useI18n()
  const isEn = language === 'en'

  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users')

  // Data Pengguna
  const [users, setUsers] = useState<RegisteredUserInfo[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')

  // Data Laporan Pengguna
  const [reports, setReports] = useState<UserReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const [, startTransition] = useTransition()

  // Konfigurasi Supabase
  const [config, setConfig] = useState(() => getSupabaseConfig())
  const [showConfig, setShowConfig] = useState(false)
  const [showSqlGuide, setShowSqlGuide] = useState(false)
  const [isCloudActive, setIsCloudActive] = useState(() => isSupabaseConfigured())

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await fetchRegisteredUsers()
      startTransition(() => {
        setUsers(data)
        setIsCloudActive(isSupabaseConfigured())
      })
    } catch {
      notify?.(isEn ? 'Failed to load user list.' : 'Gagal memuat daftar pengguna.', { error: true })
    } finally {
      setLoadingUsers(false)
    }
  }, [isEn, notify])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const data = await fetchUserReports()
      startTransition(() => {
        setReports(data)
      })
    } catch {
      notify?.(isEn ? 'Failed to load user reports.' : 'Gagal memuat laporan pengguna.', { error: true })
    } finally {
      setLoadingReports(false)
    }
  }, [isEn, notify])

  useEffect(() => {
    void loadUsers()
    void loadReports()
  }, [loadUsers, loadReports])

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setSupabaseConfig(config.url, config.anonKey)
    const client = getSupabaseClient()
    if (client) {
      setIsCloudActive(true)
      notify?.(isEn ? 'Supabase configuration saved!' : 'Pengaturan Supabase disimpan!')
      loadUsers()
      loadReports()
    } else {
      setIsCloudActive(false)
      notify?.(isEn ? 'URL or Anon Key is incomplete.' : 'URL atau Anon Key belum lengkap.', { error: true })
    }
  }

  const handleToggleRole = async (targetUser: RegisteredUserInfo) => {
    if (targetUser.username.toLowerCase() === currentUser.toLowerCase()) {
      notify?.(isEn ? 'Cannot change the role of your own account.' : 'Tidak dapat mengubah peran akun sendiri.', { error: true })
      return
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin'
    const confirmMsg = isEn
      ? (nextRole === 'admin'
          ? `Grant Admin access to account "${targetUser.username}"?`
          : `Revoke Admin access from account "${targetUser.username}"?`)
      : (nextRole === 'admin'
          ? `Berikan hak akses Admin kepada akun "${targetUser.username}"?`
          : `Cabut hak akses Admin dari akun "${targetUser.username}"?`)

    if (!window.confirm(confirmMsg)) return

    const err = await updateRemoteUserRole(targetUser.username, nextRole)
    if (err) {
      notify?.(`${isEn ? 'Failed to change role:' : 'Gagal mengubah peran:'} ${err}`, { error: true })
    } else {
      notify?.(
        isEn
          ? `Role for account "${targetUser.username}" changed to ${nextRole}.`
          : `Peran akun "${targetUser.username}" diubah menjadi ${nextRole}.`
      )
      loadUsers()
    }
  }

  const handleChangeReportStatus = async (reportId: string, nextStatus: ReportStatus) => {
    const err = await updateUserReportStatus(reportId, nextStatus)
    if (err) {
      notify?.(`${isEn ? 'Failed to change status:' : 'Gagal mengubah status:'} ${err}`, { error: true })
    } else {
      notify?.(isEn ? 'Report status updated.' : 'Status laporan diperbarui.')
      loadReports()
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm(isEn ? 'Permanently delete this report?' : 'Hapus laporan ini secara permanen?')) return
    const err = await deleteUserReport(reportId)
    if (err) {
      notify?.(`${isEn ? 'Failed to delete report:' : 'Gagal menghapus laporan:'} ${err}`, { error: true })
    } else {
      notify?.(isEn ? 'Report deleted successfully.' : 'Laporan berhasil dihapus.')
      loadReports()
    }
  }

  const handleSendReply = async (reportId: string, currentStatus: ReportStatus) => {
    const text = replyDrafts[reportId]?.trim()
    if (!text) {
      notify?.(isEn ? 'Write a reply message first.' : 'Tulis pesan balasan terlebih dahulu.', { error: true })
      return
    }
    const nextStatus = currentStatus === 'baru' ? 'diproses' : currentStatus
    const err = await replyUserReport(reportId, text, nextStatus)
    if (err) {
      notify?.(`${isEn ? 'Failed to send reply:' : 'Gagal mengirim balasan:'} ${err}`, { error: true })
    } else {
      notify?.(isEn ? 'Reply message sent successfully to user!' : 'Pesan balasan berhasil dikirim ke pengguna!')
      setReplyDrafts((prev) => ({ ...prev, [reportId]: '' }))
      loadReports()
    }
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase().trim()),
  )

  const filteredReports = reports.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const adminCount = users.filter((u) => u.role === 'admin').length
  const bugCount = reports.filter((r) => r.type === 'Bug').length
  const saranCount = reports.filter((r) => r.type === 'Saran').length
  const kritikCount = reports.filter((r) => r.type === 'Kritik').length
  const newReportsCount = reports.filter((r) => r.status === 'baru').length

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const sqlSnippet = `-- 1. Tabel akun pengguna
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  salt text not null,
  hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

-- 2. Tabel laporan pengguna (Kritik, Saran, Bug)
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  type text not null,          -- 'Bug', 'Kritik', 'Saran'
  page text,
  message text not null,
  status text not null default 'baru', -- 'baru', 'diproses', 'selesai'
  created_at timestamptz not null default now()
);

-- 3. Aktifkan Row Level Security
alter table public.app_users enable row level security;
alter table public.user_reports enable row level security;

-- 4. Kebijakan akses app_users
create policy "Allow read users" on public.app_users for select using (true);
create policy "Allow register users" on public.app_users for insert with check (true);
create policy "Allow update users" on public.app_users for update using (true);

-- 5. Kebijakan akses user_reports
create policy "Allow insert reports" on public.user_reports for insert with check (true);
create policy "Allow manage reports" on public.user_reports for all using (true);`

  return (
    <div className="card admin-panel">
      <div className="card-head">
        <div>
          <h2>{isEn ? 'Owner & Admin Panel' : 'Panel Pemilik & Admin'}</h2>
          <p className="card-desc">
            {isEn
              ? 'Manage registered users and monitor feedback, feature suggestions, and bug reports from users.'
              : 'Kelola pengguna terdaftar dan pantau kritik, saran, serta laporan bug dari pengguna.'}
          </p>
        </div>
        <div className="admin-status-badge">
          <span className={`status-dot ${isCloudActive ? 'dot-active' : 'dot-local'}`} />
          <span>
            {isCloudActive
              ? (isEn ? 'Supabase Connected' : 'Supabase Terhubung')
              : (isEn ? 'Local Storage' : 'Penyimpanan Lokal')}
          </span>
        </div>
      </div>

      <nav className="admin-subnav" aria-label={isEn ? 'Admin Sub-navigation' : 'Sub-navigasi Admin'}>
        <button
          type="button"
          className={`admin-subtab${activeTab === 'users' ? ' admin-subtab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          {isEn ? 'Manage Users' : 'Kelola Pengguna'} ({users.length})
        </button>
        <button
          type="button"
          className={`admin-subtab${activeTab === 'reports' ? ' admin-subtab-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          {isEn ? 'User Reports' : 'Laporan Pengguna'} ({reports.length})
          {newReportsCount > 0 && (
            <span className="admin-subtab-badge">
              {newReportsCount} {isEn ? 'new' : 'baru'}
            </span>
          )}
        </button>
      </nav>

      {activeTab === 'users' ? (
        <>
          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Total Users' : 'Total Pengguna'}</span>
              <span className="metric-value">{users.length}</span>
              <span className="metric-sub">{isEn ? 'Registered accounts' : 'Akun terdaftar'}</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Total Admins' : 'Total Admin'}</span>
              <span className="metric-value">{adminCount}</span>
              <span className="metric-sub">{isEn ? 'Owners & managers' : 'Pemilik & pengelola'}</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Active Storage' : 'Penyimpanan Aktif'}</span>
              <span className="metric-value-text">{isCloudActive ? 'Cloud Database' : (isEn ? 'Local Browser' : 'Browser Lokal')}</span>
              <span className="metric-sub">{isCloudActive ? (isEn ? 'Online & Multi-device' : 'Online & Multi-device') : (isEn ? 'This device only' : 'Khusus perangkat ini')}</span>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-actions-left">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowConfig((prev) => !prev)}
              >
                {showConfig
                  ? (isEn ? 'Close Supabase Settings' : 'Tutup Pengaturan Supabase')
                  : (isEn ? 'Supabase Config' : 'Konfigurasi Supabase')}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSqlGuide((prev) => !prev)}
              >
                {showSqlGuide
                  ? (isEn ? 'Close SQL Guide' : 'Tutup Panduan SQL')
                  : (isEn ? 'Database SQL Script' : 'Skrip SQL Database')}
              </button>
            </div>
            <div className="admin-actions-right">
              <input
                type="text"
                className="input input-sm admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEn ? 'Search users...' : 'Cari pengguna...'}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadUsers}
                disabled={loadingUsers}
              >
                {loadingUsers ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'Reload' : 'Muat Ulang')}
              </button>
            </div>
          </div>

          {showConfig && (
            <form onSubmit={handleSaveConfig} className="admin-config-box">
              <h3>{isEn ? 'Supabase Connection' : 'Koneksi Supabase'}</h3>
              <p className="small muted">
                {isEn
                  ? 'Enter Project URL and Anon Key from your Supabase dashboard. You can also define them in your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
                  : 'Masukkan Project URL dan Anon Key dari dashboard Supabase Anda. Anda juga dapat menaruhnya di file .env dengan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'}
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="supabase-url">Project URL</label>
                <input
                  id="supabase-url"
                  type="text"
                  className="input"
                  value={config.url}
                  onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
                  placeholder="https://xyzcompany.supabase.co"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supabase-key">Anon Public Key</label>
                <input
                  id="supabase-key"
                  type="text"
                  className="input"
                  value={config.anonKey}
                  onChange={(e) => setConfig((c) => ({ ...c, anonKey: e.target.value }))}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                />
              </div>
              <div className="admin-config-buttons">
                <button type="submit" className="btn btn-primary">
                  {isEn ? 'Save Connection' : 'Simpan Koneksi'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setConfig({ url: '', anonKey: '' })
                    setSupabaseConfig('', '')
                    setIsCloudActive(false)
                    notify?.(isEn ? 'Supabase configuration removed, back to local mode.' : 'Konfigurasi Supabase dihapus, kembali ke mode lokal.')
                    loadUsers()
                  }}
                >
                  {isEn ? 'Remove Configuration' : 'Hapus Konfigurasi'}
                </button>
              </div>
            </form>
          )}

          {showSqlGuide && (
            <div className="admin-sql-box">
              <div className="admin-sql-header">
                <h3>{isEn ? 'Supabase SQL Script (Accounts & Reports)' : 'Skrip SQL Supabase (Akun & Laporan)'}</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(sqlSnippet)
                    notify?.(isEn ? 'SQL script copied to clipboard!' : 'Skrip SQL disalin ke clipboard!')
                  }}
                >
                  {isEn ? 'Copy SQL' : 'Salin SQL'}
                </button>
              </div>
              <p className="small muted">
                {isEn ? (
                  <>
                    Open <strong>SQL Editor</strong> in your Supabase dashboard, paste the script below, and click <strong>Run</strong>.
                  </>
                ) : (
                  <>
                    Buka menu <strong>SQL Editor</strong> di dashboard Supabase Anda, tempelkan skrip di bawah ini, lalu klik <strong>Run</strong>.
                  </>
                )}
              </p>
              <pre className="admin-sql-pre">
                <code>{sqlSnippet}</code>
              </pre>
            </div>
          )}

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>No</th>
                  <th>{isEn ? 'Username' : 'Nama Pengguna'}</th>
                  <th style={{ width: '130px' }}>{isEn ? 'Role' : 'Peran'}</th>
                  <th>{isEn ? 'Registered At' : 'Terdaftar Pada'}</th>
                  <th>{isEn ? 'Last Active' : 'Terakhir Aktif'}</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>{isEn ? 'Action' : 'Aksi'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      {loadingUsers
                        ? (isEn ? 'Loading account data...' : 'Sedang memuat data akun...')
                        : (isEn ? 'No matching users found.' : 'Belum ada pengguna yang sesuai.')}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isCurrent = u.username.toLowerCase() === currentUser.toLowerCase()
                    return (
                      <tr key={u.username}>
                        <td className="muted">{idx + 1}</td>
                        <td className="bold">
                          {u.username}
                          {isCurrent && <span className="admin-you-tag"> {isEn ? '(You)' : '(Anda)'}</span>}
                        </td>
                        <td>
                          <span
                            className={`role-badge ${
                              u.role === 'admin' ? 'role-admin' : 'role-user'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : (isEn ? 'User' : 'Pengguna')}
                          </span>
                        </td>
                        <td className="small muted">{formatDate(u.created_at)}</td>
                        <td className="small muted">{formatDate(u.last_login)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {!isCurrent ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleToggleRole(u)}
                              title={
                                u.role === 'admin'
                                  ? (isEn ? 'Change to regular user' : 'Ubah jadi pengguna biasa')
                                  : (isEn ? 'Grant Admin rights' : 'Beri hak akses Admin')
                              }
                            >
                              {u.role === 'admin'
                                ? (isEn ? 'Make User' : 'Jadikan User')
                                : (isEn ? 'Make Admin' : 'Jadikan Admin')}
                            </button>
                          ) : (
                            <span className="small muted">{isEn ? 'Your Account' : 'Akun Anda'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Total Reports' : 'Total Laporan'}</span>
              <span className="metric-value">{reports.length}</span>
              <span className="metric-sub">{isEn ? 'Feedback, suggestions & bugs' : 'Kritik, saran & bug'}</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Bug Reports' : 'Laporan Bug'}</span>
              <span className="metric-value">{bugCount}</span>
              <span className="metric-sub">{isEn ? 'Technical issues' : 'Masalah teknis'}</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Feature Ideas' : 'Saran Fitur'}</span>
              <span className="metric-value">{saranCount}</span>
              <span className="metric-sub">{isEn ? 'Ideas & development' : 'Ide & pengembangan'}</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">{isEn ? 'Critiques' : 'Kritik'}</span>
              <span className="metric-value">{kritikCount}</span>
              <span className="metric-sub">{isEn ? 'Evaluation & feedback' : 'Evaluasi & masukan'}</span>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-actions-left">
              <CustomSelect
                className="input input-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label={isEn ? 'Filter report type' : 'Filter jenis laporan'}
                title={isEn ? 'Filter Report Type' : 'Filter Jenis Laporan'}
              >
                <option value="all">{isEn ? 'All Report Types' : 'Semua Jenis Laporan'}</option>
                <option value="Bug">{isEn ? 'Bugs Only' : 'Khusus Bug'}</option>
                <option value="Saran">{isEn ? 'Suggestions Only' : 'Khusus Saran'}</option>
                <option value="Kritik">{isEn ? 'Critiques Only' : 'Khusus Kritik'}</option>
              </CustomSelect>
              <CustomSelect
                className="input input-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label={isEn ? 'Filter report status' : 'Filter status laporan'}
                title={isEn ? 'Filter Report Status' : 'Filter Status Laporan'}
              >
                <option value="all">{isEn ? 'All Statuses' : 'Semua Status'}</option>
                <option value="baru">{isEn ? 'Status: New' : 'Status: Baru'}</option>
                <option value="diproses">{isEn ? 'Status: In Progress' : 'Status: Diproses'}</option>
                <option value="selesai">{isEn ? 'Status: Resolved' : 'Status: Selesai'}</option>
              </CustomSelect>
            </div>
            <div className="admin-actions-right">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadReports}
                disabled={loadingReports}
              >
                {loadingReports ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'Reload Reports' : 'Muat Ulang Laporan')}
              </button>
            </div>
          </div>

          <div className="admin-reports-list">
            {filteredReports.length === 0 ? (
              <div className="admin-empty card">
                {loadingReports
                  ? (isEn ? 'Loading report data...' : 'Sedang memuat data laporan...')
                  : (isEn ? 'No user reports yet.' : 'Belum ada laporan pengguna yang masuk.')}
              </div>
            ) : (
              filteredReports.map((r) => {
                const typeClass =
                  r.type === 'Bug'
                    ? 'report-tag-bug'
                    : r.type === 'Saran'
                    ? 'report-tag-saran'
                    : 'report-tag-kritik'

                const statusClass =
                  r.status === 'baru'
                    ? 'report-status-baru'
                    : r.status === 'diproses'
                    ? 'report-status-diproses'
                    : 'report-status-selesai'

                return (
                  <article key={r.id} className="report-item card">
                    <div className="report-item-header">
                      <div className="report-item-meta">
                        <span className={`report-tag ${typeClass}`}>{r.type}</span>
                        <span className="report-item-user">
                          {isEn ? 'By:' : 'Oleh:'} <strong>{r.username}</strong>
                        </span>
                        {r.page && (
                          <span className="small muted">
                            {isEn ? 'Page:' : 'Halaman:'} <em>{r.page}</em>
                          </span>
                        )}
                        <span className="small muted">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="report-item-controls">
                        <span className={`report-status-badge ${statusClass}`}>
                          {r.status === 'baru'
                            ? (isEn ? 'New' : 'Baru')
                            : r.status === 'diproses'
                            ? (isEn ? 'In Progress' : 'Diproses')
                            : (isEn ? 'Resolved' : 'Selesai')}
                        </span>
                        <CustomSelect
                          className="input input-sm report-status-select"
                          value={r.status}
                          onChange={(e) =>
                            handleChangeReportStatus(r.id, e.target.value as ReportStatus)
                          }
                          aria-label={isEn ? `Change report status ${r.id}` : `Ubah status laporan ${r.id}`}
                          title={isEn ? `Change Report Status #${r.id}` : `Ubah Status Laporan #${r.id}`}
                        >
                          <option value="baru">{isEn ? 'Mark New' : 'Tandai Baru'}</option>
                          <option value="diproses">{isEn ? 'Mark In Progress' : 'Tandai Diproses'}</option>
                          <option value="selesai">{isEn ? 'Mark Resolved' : 'Tandai Selesai'}</option>
                        </CustomSelect>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteReport(r.id)}
                          title={isEn ? 'Delete this report' : 'Hapus laporan ini'}
                        >
                          {isEn ? 'Delete' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                    <div className="report-item-message">
                      <p>{r.message}</p>
                    </div>

                    {r.admin_reply && (
                      <div className="report-item-reply-box">
                        <div className="report-item-reply-header">
                          <strong>{isEn ? 'Your Reply (Admin):' : 'Balasan Anda (Admin):'}</strong>
                          {r.replied_at && (
                            <span className="small muted">{formatDate(r.replied_at)}</span>
                          )}
                        </div>
                        <p>{r.admin_reply}</p>
                      </div>
                    )}

                    <div className="report-reply-input-group">
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder={isEn ? `Write reply for ${r.username}...` : `Tulis balasan untuk ${r.username}...`}
                        value={replyDrafts[r.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleSendReply(r.id, r.status)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void handleSendReply(r.id, r.status)}
                      >
                        {r.admin_reply
                          ? (isEn ? 'Edit Reply' : 'Ubah Balasan')
                          : (isEn ? 'Send Reply' : 'Kirim Balasan')}
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
