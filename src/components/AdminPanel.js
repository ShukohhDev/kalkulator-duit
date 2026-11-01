import {
  fetchRegisteredUsers,
  updateRemoteUserRole,
} from '../lib/auth.js';
import {
  getSupabaseConfig,
  setSupabaseConfig,
  isSupabaseConfigured,
  getSupabaseClient,
} from '../lib/supabase.js';
import {
  fetchUserReports,
  updateUserReportStatus,
  replyUserReport,
  deleteUserReport,
} from '../lib/reports.js';
import { useI18n } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';

export function renderAdminPanel(container, { currentUser, notify, lang }) {
  if (!container) return;

  const { language } = useI18n();
  const currentLang = lang || language || 'id';
  const isEn = currentLang === 'en';

  let activeTab = 'users'; // 'users' | 'reports'
  let users = [];
  let loadingUsers = true;
  let search = '';

  let reports = [];
  let loadingReports = false;
  let filterType = 'all';
  let filterStatus = 'all';
  const replyDrafts = {};

  let config = getSupabaseConfig();
  let showConfig = false;
  let showSqlGuide = false;
  let isCloudActive = isSupabaseConfigured();

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
create policy "Allow manage reports" on public.user_reports for all using (true);`;

  function formatDate(isoString) {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  async function loadUsers() {
    loadingUsers = true;
    render();
    try {
      const data = await fetchRegisteredUsers();
      users = data;
      isCloudActive = isSupabaseConfigured();
    } catch {
      notify?.(isEn ? 'Failed to load user list.' : 'Gagal memuat daftar pengguna.', { error: true });
    } finally {
      loadingUsers = false;
      render();
    }
  }

  async function loadReports() {
    loadingReports = true;
    render();
    try {
      const data = await fetchUserReports();
      reports = data;
    } catch {
      notify?.(isEn ? 'Failed to load user reports.' : 'Gagal memuat laporan pengguna.', { error: true });
    } finally {
      loadingReports = false;
      render();
    }
  }

  async function handleToggleRole(targetUser) {
    if (targetUser.username.toLowerCase() === currentUser.toLowerCase()) {
      notify?.(isEn ? 'Cannot change the role of your own account.' : 'Tidak dapat mengubah peran akun sendiri.', { error: true });
      return;
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = isEn
      ? (nextRole === 'admin'
        ? `Grant Admin access to account "${targetUser.username}"?`
        : `Revoke Admin access from account "${targetUser.username}"?`)
      : (nextRole === 'admin'
        ? `Berikan hak akses Admin kepada akun "${targetUser.username}"?`
        : `Cabut hak akses Admin dari akun "${targetUser.username}"?`);

    if (!window.confirm(confirmMsg)) return;

    const err = await updateRemoteUserRole(targetUser.username, nextRole);
    if (err) {
      notify?.(`${isEn ? 'Failed to change role:' : 'Gagal mengubah peran:'} ${err}`, { error: true });
    } else {
      notify?.(
        isEn
          ? `Role for account "${targetUser.username}" changed to ${nextRole}.`
          : `Peran akun "${targetUser.username}" diubah menjadi ${nextRole}.`
      );
      loadUsers();
    }
  }

  async function handleChangeReportStatus(reportId, nextStatus) {
    const err = await updateUserReportStatus(reportId, nextStatus);
    if (err) {
      notify?.(`${isEn ? 'Failed to change status:' : 'Gagal mengubah status:'} ${err}`, { error: true });
    } else {
      notify?.(isEn ? 'Report status updated.' : 'Status laporan diperbarui.');
      loadReports();
    }
  }

  async function handleDeleteReport(reportId) {
    if (!window.confirm(isEn ? 'Permanently delete this report?' : 'Hapus laporan ini secara permanen?')) return;
    const err = await deleteUserReport(reportId);
    if (err) {
      notify?.(`${isEn ? 'Failed to delete report:' : 'Gagal menghapus laporan:'} ${err}`, { error: true });
    } else {
      notify?.(isEn ? 'Report deleted successfully.' : 'Laporan berhasil dihapus.');
      loadReports();
    }
  }

  async function handleSendReply(reportId, currentStatus) {
    const text = replyDrafts[reportId]?.trim();
    if (!text) {
      notify?.(isEn ? 'Write a reply message first.' : 'Tulis pesan balasan terlebih dahulu.', { error: true });
      return;
    }
    const nextStatus = currentStatus === 'baru' ? 'diproses' : currentStatus;
    const err = await replyUserReport(reportId, text, nextStatus);
    if (err) {
      notify?.(`${isEn ? 'Failed to send reply:' : 'Gagal mengirim balasan:'} ${err}`, { error: true });
    } else {
      notify?.(isEn ? 'Reply message sent successfully to user!' : 'Pesan balasan berhasil dikirim ke pengguna!');
      delete replyDrafts[reportId];
      loadReports();
    }
  }

  function handleSaveConfig(e) {
    e.preventDefault();
    setSupabaseConfig(config.url, config.anonKey);
    const client = getSupabaseClient();
    if (client) {
      isCloudActive = true;
      notify?.(isEn ? 'Supabase configuration saved!' : 'Pengaturan Supabase disimpan!');
      loadUsers();
      loadReports();
    } else {
      isCloudActive = false;
      notify?.(isEn ? 'URL or Anon Key is incomplete.' : 'URL atau Anon Key belum lengkap.', { error: true });
    }
  }

  function render() {
    const filteredUsers = users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase().trim()),
    );

    const filteredReports = reports.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });

    const adminCount = users.filter((u) => u.role === 'admin').length;
    const bugCount = reports.filter((r) => r.type === 'Bug').length;
    const saranCount = reports.filter((r) => r.type === 'Saran').length;
    const kritikCount = reports.filter((r) => r.type === 'Kritik').length;
    const newReportsCount = reports.filter((r) => r.status === 'baru').length;

    let subviewHtml = '';

    if (activeTab === 'users') {
      subviewHtml = `
        <div class="admin-metrics-grid">
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Total Users' : 'Total Pengguna'}</span>
            <span class="metric-value">${users.length}</span>
            <span class="metric-sub">${isEn ? 'Registered accounts' : 'Akun terdaftar'}</span>
          </div>
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Total Admins' : 'Total Admin'}</span>
            <span class="metric-value">${adminCount}</span>
            <span class="metric-sub">${isEn ? 'Owners & managers' : 'Pemilik & pengelola'}</span>
          </div>
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Active Storage' : 'Penyimpanan Aktif'}</span>
            <span class="metric-value-text">${isCloudActive ? 'Cloud Database' : (isEn ? 'Local Browser' : 'Browser Lokal')}</span>
            <span class="metric-sub">${isCloudActive ? (isEn ? 'Online & Multi-device' : 'Online & Multi-device') : (isEn ? 'This device only' : 'Khusus perangkat ini')}</span>
          </div>
        </div>

        <div class="admin-toolbar">
          <div class="admin-actions-left">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-cfg">
              ${showConfig
                ? (isEn ? 'Close Supabase Settings' : 'Tutup Pengaturan Supabase')
                : (isEn ? 'Supabase Config' : 'Konfigurasi Supabase')}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-sql">
              ${showSqlGuide
                ? (isEn ? 'Close SQL Guide' : 'Tutup Panduan SQL')
                : (isEn ? 'Database SQL Script' : 'Skrip SQL Database')}
            </button>
          </div>
          <div class="admin-actions-right">
            <input
              type="text"
              class="input input-sm admin-search"
              id="admin-user-search"
              value="${escapeHtml(search)}"
              placeholder="${isEn ? 'Search users...' : 'Cari pengguna...'}"
            />
            <button type="button" class="btn btn-primary btn-sm" id="btn-reload-users" ${loadingUsers ? 'disabled' : ''}>
              ${loadingUsers ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'Reload' : 'Muat Ulang')}
            </button>
          </div>
        </div>

        ${showConfig ? `
          <form id="admin-cfg-form" class="admin-config-box">
            <h3>${isEn ? 'Supabase Connection' : 'Koneksi Supabase'}</h3>
            <p class="small muted">
              ${isEn
                ? 'Enter Project URL and Anon Key from your Supabase dashboard. You can also define them in your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
                : 'Masukkan Project URL dan Anon Key dari dashboard Supabase Anda. Anda juga dapat menaruhnya di file .env dengan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'}
            </p>
            <div class="form-group">
              <label class="form-label" for="supabase-url">Project URL</label>
              <input
                id="supabase-url"
                type="text"
                class="input"
                value="${escapeHtml(config.url || '')}"
                placeholder="https://xyzcompany.supabase.co"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="supabase-key">Anon Public Key</label>
              <input
                id="supabase-key"
                type="text"
                class="input"
                value="${escapeHtml(config.anonKey || '')}"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              />
            </div>
            <div class="admin-config-buttons">
              <button type="submit" class="btn btn-primary">
                ${isEn ? 'Save Connection' : 'Simpan Koneksi'}
              </button>
              <button type="button" class="btn btn-ghost" id="btn-remove-cfg">
                ${isEn ? 'Remove Configuration' : 'Hapus Konfigurasi'}
              </button>
            </div>
          </form>
        ` : ''}

        ${showSqlGuide ? `
          <div class="admin-sql-box">
            <div class="admin-sql-header">
              <h3>${isEn ? 'Supabase SQL Script (Accounts & Reports)' : 'Skrip SQL Supabase (Akun & Laporan)'}</h3>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-sql">
                ${isEn ? 'Copy SQL' : 'Salin SQL'}
              </button>
            </div>
            <p class="small muted">
              ${isEn
                ? 'Open <strong>SQL Editor</strong> in your Supabase dashboard, paste the script below, and click <strong>Run</strong>.'
                : 'Buka menu <strong>SQL Editor</strong> di dashboard Supabase Anda, tempelkan skrip di bawah ini, lalu klik <strong>Run</strong>.'}
            </p>
            <pre class="admin-sql-pre"><code>${escapeHtml(sqlSnippet)}</code></pre>
          </div>
        ` : ''}

        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 48px">No</th>
                <th>${isEn ? 'Username' : 'Nama Pengguna'}</th>
                <th style="width: 130px">${isEn ? 'Role' : 'Peran'}</th>
                <th>${isEn ? 'Registered At' : 'Terdaftar Pada'}</th>
                <th>${isEn ? 'Last Active' : 'Terakhir Aktif'}</th>
                <th style="width: 140px; text-align: right">${isEn ? 'Action' : 'Aksi'}</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.length === 0 ? `
                <tr>
                  <td colspan="6" class="admin-empty">
                    ${loadingUsers
                      ? (isEn ? 'Loading account data...' : 'Sedang memuat data akun...')
                      : (isEn ? 'No matching users found.' : 'Belum ada pengguna yang sesuai.')}
                  </td>
                </tr>
              ` : filteredUsers.map((u, idx) => {
                const isCurrent = u.username.toLowerCase() === currentUser.toLowerCase();
                return `
                  <tr>
                    <td class="muted">${idx + 1}</td>
                    <td class="bold">
                      ${escapeHtml(u.username)}
                      ${isCurrent ? `<span class="admin-you-tag"> ${isEn ? '(You)' : '(Anda)'}</span>` : ''}
                    </td>
                    <td>
                      <span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">
                        ${u.role === 'admin' ? 'Admin' : (isEn ? 'User' : 'Pengguna')}
                      </span>
                    </td>
                    <td class="small muted">${formatDate(u.created_at)}</td>
                    <td class="small muted">${formatDate(u.last_login)}</td>
                    <td style="text-align: right">
                      ${!isCurrent ? `
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm btn-toggle-role"
                          data-username="${escapeHtml(u.username)}"
                          title="${u.role === 'admin'
                            ? (isEn ? 'Change to regular user' : 'Ubah jadi pengguna biasa')
                            : (isEn ? 'Grant Admin rights' : 'Beri hak akses Admin')}"
                        >
                          ${u.role === 'admin'
                            ? (isEn ? 'Make User' : 'Jadikan User')
                            : (isEn ? 'Make Admin' : 'Jadikan Admin')}
                        </button>
                      ` : `
                        <span class="small muted">${isEn ? 'Your Account' : 'Akun Anda'}</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      subviewHtml = `
        <div class="admin-metrics-grid">
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Total Reports' : 'Total Laporan'}</span>
            <span class="metric-value">${reports.length}</span>
            <span class="metric-sub">${isEn ? 'Feedback, suggestions & bugs' : 'Kritik, saran & bug'}</span>
          </div>
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Bug Reports' : 'Laporan Bug'}</span>
            <span class="metric-value">${bugCount}</span>
            <span class="metric-sub">${isEn ? 'Technical issues' : 'Masalah teknis'}</span>
          </div>
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Feature Ideas' : 'Saran Fitur'}</span>
            <span class="metric-value">${saranCount}</span>
            <span class="metric-sub">${isEn ? 'Ideas & development' : 'Ide & pengembangan'}</span>
          </div>
          <div class="admin-metric-card">
            <span class="metric-label">${isEn ? 'Critiques' : 'Kritik'}</span>
            <span class="metric-value">${kritikCount}</span>
            <span class="metric-sub">${isEn ? 'Evaluation & feedback' : 'Evaluasi & masukan'}</span>
          </div>
        </div>

        <div class="admin-toolbar">
          <div class="admin-actions-left">
            <select class="input input-sm" id="filter-report-type" aria-label="${isEn ? 'Filter report type' : 'Filter jenis laporan'}">
              <option value="all" ${filterType === 'all' ? 'selected' : ''}>${isEn ? 'All Report Types' : 'Semua Jenis Laporan'}</option>
              <option value="Bug" ${filterType === 'Bug' ? 'selected' : ''}>${isEn ? 'Bugs Only' : 'Khusus Bug'}</option>
              <option value="Saran" ${filterType === 'Saran' ? 'selected' : ''}>${isEn ? 'Suggestions Only' : 'Khusus Saran'}</option>
              <option value="Kritik" ${filterType === 'Kritik' ? 'selected' : ''}>${isEn ? 'Critiques Only' : 'Khusus Kritik'}</option>
            </select>
            <select class="input input-sm" id="filter-report-status" aria-label="${isEn ? 'Filter report status' : 'Filter status laporan'}">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>${isEn ? 'All Statuses' : 'Semua Status'}</option>
              <option value="baru" ${filterStatus === 'baru' ? 'selected' : ''}>${isEn ? 'Status: New' : 'Status: Baru'}</option>
              <option value="diproses" ${filterStatus === 'diproses' ? 'selected' : ''}>${isEn ? 'Status: In Progress' : 'Status: Diproses'}</option>
              <option value="selesai" ${filterStatus === 'selesai' ? 'selected' : ''}>${isEn ? 'Status: Resolved' : 'Status: Selesai'}</option>
            </select>
          </div>
          <div class="admin-actions-right">
            <button type="button" class="btn btn-primary btn-sm" id="btn-reload-reports" ${loadingReports ? 'disabled' : ''}>
              ${loadingReports ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'Reload Reports' : 'Muat Ulang Laporan')}
            </button>
          </div>
        </div>

        <div class="admin-reports-list">
          ${filteredReports.length === 0 ? `
            <div class="admin-empty card">
              ${loadingReports
                ? (isEn ? 'Loading report data...' : 'Sedang memuat data laporan...')
                : (isEn ? 'No user reports yet.' : 'Belum ada laporan pengguna yang masuk.')}
            </div>
          ` : filteredReports.map((r) => {
            const typeClass = r.type === 'Bug' ? 'report-tag-bug' : r.type === 'Saran' ? 'report-tag-saran' : 'report-tag-kritik';
            const statusClass = r.status === 'baru' ? 'report-status-baru' : r.status === 'diproses' ? 'report-status-diproses' : 'report-status-selesai';

            return `
              <article class="report-item card" data-id="${escapeHtml(r.id)}">
                <div class="report-item-header">
                  <div class="report-item-meta">
                    <span class="report-tag ${typeClass}">${escapeHtml(r.type)}</span>
                    <span class="report-item-user">${isEn ? 'By:' : 'Oleh:'} <strong>${escapeHtml(r.username)}</strong></span>
                    ${r.page ? `<span class="small muted">${isEn ? 'Page:' : 'Halaman:'} <em>${escapeHtml(r.page)}</em></span>` : ''}
                    <span class="small muted">${formatDate(r.created_at)}</span>
                  </div>
                  <div class="report-item-controls">
                    <span class="report-status-badge ${statusClass}">
                      ${r.status === 'baru' ? (isEn ? 'New' : 'Baru') : r.status === 'diproses' ? (isEn ? 'In Progress' : 'Diproses') : (isEn ? 'Resolved' : 'Selesai')}
                    </span>
                    <select class="input input-sm report-status-select" data-id="${escapeHtml(r.id)}" aria-label="${isEn ? `Change report status ${r.id}` : `Ubah status laporan ${r.id}`}">
                      <option value="baru" ${r.status === 'baru' ? 'selected' : ''}>${isEn ? 'Mark New' : 'Tandai Baru'}</option>
                      <option value="diproses" ${r.status === 'diproses' ? 'selected' : ''}>${isEn ? 'Mark In Progress' : 'Tandai Diproses'}</option>
                      <option value="selesai" ${r.status === 'selesai' ? 'selected' : ''}>${isEn ? 'Mark Resolved' : 'Tandai Selesai'}</option>
                    </select>
                    <button type="button" class="btn btn-ghost btn-sm btn-del-report" data-id="${escapeHtml(r.id)}" title="${isEn ? 'Delete this report' : 'Hapus laporan ini'}">
                      ${isEn ? 'Delete' : 'Hapus'}
                    </button>
                  </div>
                </div>
                <div class="report-item-message">
                  <p>${escapeHtml(r.message)}</p>
                </div>

                ${r.admin_reply ? `
                  <div class="report-item-reply-box">
                    <div class="report-item-reply-header">
                      <strong>${isEn ? 'Your Reply (Admin):' : 'Balasan Anda (Admin):'}</strong>
                      ${r.replied_at ? `<span class="small muted">${formatDate(r.replied_at)}</span>` : ''}
                    </div>
                    <p>${escapeHtml(r.admin_reply)}</p>
                  </div>
                ` : ''}

                <div class="report-reply-input-group">
                  <input
                    type="text"
                    class="input input-sm report-reply-input"
                    data-id="${escapeHtml(r.id)}"
                    placeholder="${isEn ? `Write reply for ${r.username}...` : `Tulis balasan untuk ${r.username}...`}"
                    value="${escapeHtml(replyDrafts[r.id] || '')}"
                  />
                  <button type="button" class="btn btn-primary btn-sm btn-send-reply" data-id="${escapeHtml(r.id)}" data-status="${r.status}">
                    ${r.admin_reply ? (isEn ? 'Edit Reply' : 'Ubah Balasan') : (isEn ? 'Send Reply' : 'Kirim Balasan')}
                  </button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card admin-panel">
        <div class="card-head">
          <div>
            <h2>${isEn ? 'Owner & Admin Panel' : 'Panel Pemilik & Admin'}</h2>
            <p class="card-desc">
              ${isEn
                ? 'Manage registered users and monitor feedback, feature suggestions, and bug reports from users.'
                : 'Kelola pengguna terdaftar dan pantau kritik, saran, serta laporan bug dari pengguna.'}
            </p>
          </div>
          <div class="admin-status-badge">
            <span class="status-dot ${isCloudActive ? 'dot-active' : 'dot-local'}"></span>
            <span>
              ${isCloudActive
                ? (isEn ? 'Supabase Connected' : 'Supabase Terhubung')
                : (isEn ? 'Local Storage' : 'Penyimpanan Lokal')}
            </span>
          </div>
        </div>

        <nav class="admin-subnav" aria-label="${isEn ? 'Admin Sub-navigation' : 'Sub-navigasi Admin'}">
          <button
            type="button"
            class="admin-subtab${activeTab === 'users' ? ' admin-subtab-active' : ''}"
            id="tab-btn-users"
          >
            ${isEn ? 'Manage Users' : 'Kelola Pengguna'} (${users.length})
          </button>
          <button
            type="button"
            class="admin-subtab${activeTab === 'reports' ? ' admin-subtab-active' : ''}"
            id="tab-btn-reports"
          >
            ${isEn ? 'User Reports' : 'Laporan Pengguna'} (${reports.length})
            ${newReportsCount > 0 ? `
              <span class="admin-subtab-badge">
                ${newReportsCount} ${isEn ? 'new' : 'baru'}
              </span>
            ` : ''}
          </button>
        </nav>

        ${subviewHtml}
      </div>
    `;

    // Attach Event Listeners
    container.querySelector('#tab-btn-users')?.addEventListener('click', () => {
      activeTab = 'users';
      render();
    });

    container.querySelector('#tab-btn-reports')?.addEventListener('click', () => {
      activeTab = 'reports';
      render();
    });

    if (activeTab === 'users') {
      container.querySelector('#btn-toggle-cfg')?.addEventListener('click', () => {
        showConfig = !showConfig;
        render();
      });

      container.querySelector('#btn-toggle-sql')?.addEventListener('click', () => {
        showSqlGuide = !showSqlGuide;
        render();
      });

      const searchInput = container.querySelector('#admin-user-search');
      searchInput?.addEventListener('input', (e) => {
        search = e.target.value;
      });
      searchInput?.addEventListener('change', () => {
        render();
      });
      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          render();
        }
      });

      container.querySelector('#btn-reload-users')?.addEventListener('click', () => {
        loadUsers();
      });

      const cfgForm = container.querySelector('#admin-cfg-form');
      cfgForm?.addEventListener('submit', (e) => {
        const url = container.querySelector('#supabase-url')?.value.trim() || '';
        const anonKey = container.querySelector('#supabase-key')?.value.trim() || '';
        config = { url, anonKey };
        handleSaveConfig(e);
      });

      container.querySelector('#btn-remove-cfg')?.addEventListener('click', () => {
        config = { url: '', anonKey: '' };
        setSupabaseConfig('', '');
        setIsCloudActive(false);
        notify?.(isEn ? 'Supabase configuration removed, back to local mode.' : 'Konfigurasi Supabase dihapus, kembali ke mode lokal.');
        loadUsers();
      });

      container.querySelector('#btn-copy-sql')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(sqlSnippet);
        notify?.(isEn ? 'SQL script copied to clipboard!' : 'Skrip SQL disalin ke clipboard!');
      });

      container.querySelectorAll('.btn-toggle-role').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uname = btn.dataset.username;
          const target = users.find((u) => u.username === uname);
          if (target) handleToggleRole(target);
        });
      });
    } else {
      const typeSel = container.querySelector('#filter-report-type');
      typeSel?.addEventListener('change', (e) => {
        filterType = e.target.value;
        render();
      });

      const statusSel = container.querySelector('#filter-report-status');
      statusSel?.addEventListener('change', (e) => {
        filterStatus = e.target.value;
        render();
      });

      container.querySelector('#btn-reload-reports')?.addEventListener('click', () => {
        loadReports();
      });

      container.querySelectorAll('.report-status-select').forEach((sel) => {
        sel.addEventListener('change', (e) => {
          const id = sel.dataset.id;
          handleChangeReportStatus(id, e.target.value);
        });
      });

      container.querySelectorAll('.btn-del-report').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          handleDeleteReport(id);
        });
      });

      container.querySelectorAll('.report-reply-input').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const id = inp.dataset.id;
          replyDrafts[id] = e.target.value;
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const id = inp.dataset.id;
            const r = reports.find((rep) => rep.id === id);
            if (r) handleSendReply(id, r.status);
          }
        });
      });

      container.querySelectorAll('.btn-send-reply').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const status = btn.dataset.status;
          handleSendReply(id, status);
        });
      });
    }
  }

  // Initial load
  loadUsers();
  loadReports();
}

