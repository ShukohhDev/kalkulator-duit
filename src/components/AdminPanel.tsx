import { useEffect, useState, useTransition } from 'react'
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

interface Props {
  currentUser: string
  notify?: Notify
}

export function AdminPanel({ currentUser, notify }: Props) {
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

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await fetchRegisteredUsers()
      startTransition(() => {
        setUsers(data)
        setIsCloudActive(isSupabaseConfigured())
      })
    } catch {
      notify?.('Gagal memuat daftar pengguna.', { error: true })
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const data = await fetchUserReports()
      startTransition(() => {
        setReports(data)
      })
    } catch {
      notify?.('Gagal memuat laporan pengguna.', { error: true })
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    loadUsers()
    loadReports()
  }, [])

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setSupabaseConfig(config.url, config.anonKey)
    const client = getSupabaseClient()
    if (client) {
      setIsCloudActive(true)
      notify?.('Pengaturan Supabase disimpan!')
      loadUsers()
      loadReports()
    } else {
      setIsCloudActive(false)
      notify?.('URL atau Anon Key belum lengkap.', { error: true })
    }
  }

  const handleToggleRole = async (targetUser: RegisteredUserInfo) => {
    if (targetUser.username.toLowerCase() === currentUser.toLowerCase()) {
      notify?.('Tidak dapat mengubah peran akun sendiri.', { error: true })
      return
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin'
    const confirmMsg =
      nextRole === 'admin'
        ? `Berikan hak akses Admin kepada akun "${targetUser.username}"?`
        : `Cabut hak akses Admin dari akun "${targetUser.username}"?`

    if (!window.confirm(confirmMsg)) return

    const err = await updateRemoteUserRole(targetUser.username, nextRole)
    if (err) {
      notify?.(`Gagal mengubah peran: ${err}`, { error: true })
    } else {
      notify?.(`Peran akun "${targetUser.username}" diubah menjadi ${nextRole}.`)
      loadUsers()
    }
  }

  const handleChangeReportStatus = async (reportId: string, nextStatus: ReportStatus) => {
    const err = await updateUserReportStatus(reportId, nextStatus)
    if (err) {
      notify?.(`Gagal mengubah status: ${err}`, { error: true })
    } else {
      notify?.('Status laporan diperbarui.')
      loadReports()
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Hapus laporan ini secara permanen?')) return
    const err = await deleteUserReport(reportId)
    if (err) {
      notify?.(`Gagal menghapus laporan: ${err}`, { error: true })
    } else {
      notify?.('Laporan berhasil dihapus.')
      loadReports()
    }
  }

  const handleSendReply = async (reportId: string, currentStatus: ReportStatus) => {
    const text = replyDrafts[reportId]?.trim()
    if (!text) {
      notify?.('Tulis pesan balasan terlebih dahulu.', { error: true })
      return
    }
    const nextStatus = currentStatus === 'baru' ? 'diproses' : currentStatus
    const err = await replyUserReport(reportId, text, nextStatus)
    if (err) {
      notify?.(`Gagal mengirim balasan: ${err}`, { error: true })
    } else {
      notify?.('Pesan balasan berhasil dikirim ke pengguna!')
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
      return date.toLocaleDateString('id-ID', {
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
          <h2>Panel Pemilik & Admin</h2>
          <p className="card-desc">
            Kelola pengguna terdaftar dan pantau kritik, saran, serta laporan bug dari pengguna.
          </p>
        </div>
        <div className="admin-status-badge">
          <span className={`status-dot ${isCloudActive ? 'dot-active' : 'dot-local'}`} />
          <span>{isCloudActive ? 'Supabase Terhubung' : 'Penyimpanan Lokal'}</span>
        </div>
      </div>

      <nav className="admin-subnav" aria-label="Sub-navigasi Admin">
        <button
          type="button"
          className={`admin-subtab${activeTab === 'users' ? ' admin-subtab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Kelola Pengguna ({users.length})
        </button>
        <button
          type="button"
          className={`admin-subtab${activeTab === 'reports' ? ' admin-subtab-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Laporan Pengguna ({reports.length})
          {newReportsCount > 0 && <span className="admin-subtab-badge">{newReportsCount} baru</span>}
        </button>
      </nav>

      {activeTab === 'users' ? (
        <>
          <div className="admin-metrics-grid">
            <div className="admin-metric-card">
              <span className="metric-label">Total Pengguna</span>
              <span className="metric-value">{users.length}</span>
              <span className="metric-sub">Akun terdaftar</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">Total Admin</span>
              <span className="metric-value">{adminCount}</span>
              <span className="metric-sub">Pemilik & pengelola</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">Penyimpanan Aktif</span>
              <span className="metric-value-text">{isCloudActive ? 'Cloud Database' : 'Browser Lokal'}</span>
              <span className="metric-sub">{isCloudActive ? 'Online & Multi-device' : 'Khusus perangkat ini'}</span>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-actions-left">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowConfig((prev) => !prev)}
              >
                {showConfig ? 'Tutup Pengaturan Supabase' : 'Konfigurasi Supabase'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSqlGuide((prev) => !prev)}
              >
                {showSqlGuide ? 'Tutup Panduan SQL' : 'Skrip SQL Database'}
              </button>
            </div>
            <div className="admin-actions-right">
              <input
                type="text"
                className="input input-sm admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pengguna..."
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadUsers}
                disabled={loadingUsers}
              >
                {loadingUsers ? 'Memuat...' : 'Muat Ulang'}
              </button>
            </div>
          </div>

          {showConfig && (
            <form onSubmit={handleSaveConfig} className="admin-config-box">
              <h3>Koneksi Supabase</h3>
              <p className="small muted">
                Masukkan Project URL dan Anon Key dari dashboard Supabase Anda. Anda juga dapat menaruhnya di file .env dengan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.
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
                  Simpan Koneksi
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setConfig({ url: '', anonKey: '' })
                    setSupabaseConfig('', '')
                    setIsCloudActive(false)
                    notify?.('Konfigurasi Supabase dihapus, kembali ke mode lokal.')
                    loadUsers()
                  }}
                >
                  Hapus Konfigurasi
                </button>
              </div>
            </form>
          )}

          {showSqlGuide && (
            <div className="admin-sql-box">
              <div className="admin-sql-header">
                <h3>Skrip SQL Supabase (Akun & Laporan)</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(sqlSnippet)
                    notify?.('Skrip SQL disalin ke clipboard!')
                  }}
                >
                  Salin SQL
                </button>
              </div>
              <p className="small muted">
                Buka menu <strong>SQL Editor</strong> di dashboard Supabase Anda, tempelkan skrip di bawah ini, lalu klik <strong>Run</strong>.
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
                  <th>Nama Pengguna</th>
                  <th style={{ width: '130px' }}>Peran</th>
                  <th>Terdaftar Pada</th>
                  <th>Terakhir Aktif</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      {loadingUsers ? 'Sedang memuat data akun...' : 'Belum ada pengguna yang sesuai.'}
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
                          {isCurrent && <span className="admin-you-tag"> (Anda)</span>}
                        </td>
                        <td>
                          <span
                            className={`role-badge ${
                              u.role === 'admin' ? 'role-admin' : 'role-user'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Pengguna'}
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
                                ? 'Ubah jadi pengguna biasa'
                                : 'Beri hak akses Admin'
                              }
                            >
                              {u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                            </button>
                          ) : (
                            <span className="small muted">Akun Anda</span>
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
              <span className="metric-label">Total Laporan</span>
              <span className="metric-value">{reports.length}</span>
              <span className="metric-sub">Kritik, saran & bug</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">Laporan Bug</span>
              <span className="metric-value">{bugCount}</span>
              <span className="metric-sub">Masalah teknis</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">Saran Fitur</span>
              <span className="metric-value">{saranCount}</span>
              <span className="metric-sub">Ide & pengembangan</span>
            </div>
            <div className="admin-metric-card">
              <span className="metric-label">Kritik</span>
              <span className="metric-value">{kritikCount}</span>
              <span className="metric-sub">Evaluasi & masukan</span>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-actions-left">
              <select
                className="input input-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter jenis laporan"
              >
                <option value="all">Semua Jenis Laporan</option>
                <option value="Bug">Khusus Bug</option>
                <option value="Saran">Khusus Saran</option>
                <option value="Kritik">Khusus Kritik</option>
              </select>
              <select
                className="input input-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter status laporan"
              >
                <option value="all">Semua Status</option>
                <option value="baru">Status: Baru</option>
                <option value="diproses">Status: Diproses</option>
                <option value="selesai">Status: Selesai</option>
              </select>
            </div>
            <div className="admin-actions-right">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={loadReports}
                disabled={loadingReports}
              >
                {loadingReports ? 'Memuat...' : 'Muat Ulang Laporan'}
              </button>
            </div>
          </div>

          <div className="admin-reports-list">
            {filteredReports.length === 0 ? (
              <div className="admin-empty card">
                {loadingReports
                  ? 'Sedang memuat data laporan...'
                  : 'Belum ada laporan pengguna yang masuk.'}
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
                          Oleh: <strong>{r.username}</strong>
                        </span>
                        {r.page && (
                          <span className="small muted">
                            Halaman: <em>{r.page}</em>
                          </span>
                        )}
                        <span className="small muted">{formatDate(r.created_at)}</span>
                      </div>
                      <div className="report-item-controls">
                        <span className={`report-status-badge ${statusClass}`}>
                          {r.status === 'baru'
                            ? 'Baru'
                            : r.status === 'diproses'
                            ? 'Diproses'
                            : 'Selesai'}
                        </span>
                        <select
                          className="input input-sm report-status-select"
                          value={r.status}
                          onChange={(e) =>
                            handleChangeReportStatus(r.id, e.target.value as ReportStatus)
                          }
                          aria-label={`Ubah status laporan ${r.id}`}
                        >
                          <option value="baru">Tandai Baru</option>
                          <option value="diproses">Tandai Diproses</option>
                          <option value="selesai">Tandai Selesai</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteReport(r.id)}
                          title="Hapus laporan ini"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <div className="report-item-message">
                      <p>{r.message}</p>
                    </div>

                    {r.admin_reply && (
                      <div className="report-item-reply-box">
                        <div className="report-item-reply-header">
                          <strong>Balasan Anda (Admin):</strong>
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
                        placeholder={`Tulis balasan untuk ${r.username}...`}
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
                        {r.admin_reply ? 'Ubah Balasan' : 'Kirim Balasan'}
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
