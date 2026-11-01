/**
 * Account Security Card Component (Pure Vanilla JS)
 */
import { changePassword } from '../lib/auth.js';
import { escapeHtml } from '../lib/dom.js';

const LOCK_ICON = `
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
`;

export function renderAccountSecurityCard(container, { username, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let isOpen = false;
  let oldPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let loading = false;
  let errorMessage = '';

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    errorMessage = '';

    if (!oldPassword) {
      errorMessage = isEn ? 'Current password is required.' : 'Kata sandi saat ini harus diisi.';
      render();
      return;
    }
    if (newPassword.length < 4) {
      errorMessage = isEn ? 'New password must be at least 4 characters.' : 'Kata sandi baru minimal 4 karakter.';
      render();
      return;
    }
    if (newPassword !== confirmPassword) {
      errorMessage = isEn ? 'New password confirmation does not match.' : 'Konfirmasi kata sandi baru tidak cocok.';
      render();
      return;
    }

    loading = true;
    render();
    const err = await changePassword(username, oldPassword, newPassword);
    loading = false;

    if (err) {
      errorMessage = err;
      notify?.(err, { error: true });
      render();
    } else {
      oldPassword = '';
      newPassword = '';
      confirmPassword = '';
      isOpen = false;
      notify?.(isEn ? 'Account password updated successfully!' : 'Kata sandi akun berhasil diperbarui!');
      render();
    }
  }

  function render() {
    container.innerHTML = `
      <section class="card account-security-card" aria-label="${isEn ? 'Account Security' : 'Keamanan Akun'}">
        <header class="card-head">
          <div class="security-title-wrap">
            <span class="security-icon">
              ${LOCK_ICON}
            </span>
            <div>
              <h3>${isEn ? 'Account Security' : 'Keamanan Akun'}</h3>
              <span class="muted small">
                ${isEn ? `Manage password for ${username}` : `Kelola kata sandi akun ${username}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-toggle-security"
          >
            ${isOpen ? (isEn ? 'Close' : 'Tutup') : (isEn ? 'Change Password' : 'Ubah Kata Sandi')}
          </button>
        </header>

        ${
          isOpen
            ? `<form class="security-form" id="form-security">
                <div class="field">
                  <label for="old-pass">${isEn ? 'Current Password' : 'Kata Sandi Saat Ini'}</label>
                  <input
                    id="old-pass"
                    class="input"
                    type="password"
                    placeholder="${isEn ? 'Enter current password' : 'Masukkan kata sandi lama'}"
                    value="${escapeHtml(oldPassword)}"
                    ${loading ? 'disabled' : ''}
                    autocomplete="current-password"
                  />
                </div>

                <div class="field">
                  <label for="new-pass">${isEn ? 'New Password' : 'Kata Sandi Baru'}</label>
                  <input
                    id="new-pass"
                    class="input"
                    type="password"
                    placeholder="${isEn ? 'At least 4 characters' : 'Minimal 4 karakter'}"
                    value="${escapeHtml(newPassword)}"
                    ${loading ? 'disabled' : ''}
                    autocomplete="new-password"
                  />
                </div>

                <div class="field">
                  <label for="confirm-pass">${isEn ? 'Confirm New Password' : 'Konfirmasi Kata Sandi Baru'}</label>
                  <input
                    id="confirm-pass"
                    class="input"
                    type="password"
                    placeholder="${isEn ? 'Repeat new password' : 'Ulangi kata sandi baru'}"
                    value="${escapeHtml(confirmPassword)}"
                    ${loading ? 'disabled' : ''}
                    autocomplete="new-password"
                  />
                </div>

                ${errorMessage ? `<p class="text-danger small">${escapeHtml(errorMessage)}</p>` : ''}

                <div class="security-form-actions">
                  <button type="submit" class="btn btn-sm" ${loading ? 'disabled' : ''}>
                    ${loading ? (isEn ? 'Saving...' : 'Menyimpan...') : (isEn ? 'Save Password' : 'Simpan Kata Sandi')}
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-cancel-security"
                    ${loading ? 'disabled' : ''}
                  >
                    ${isEn ? 'Cancel' : 'Batal'}
                  </button>
                </div>
              </form>`
            : ''
        }
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.account-security-card');
    if (!root) return;

    root.querySelector('.btn-toggle-security')?.addEventListener('click', () => {
      isOpen = !isOpen;
      errorMessage = '';
      render();
    });

    if (isOpen) {
      root.querySelector('#old-pass')?.addEventListener('input', (e) => {
        oldPassword = e.target.value;
      });

      root.querySelector('#new-pass')?.addEventListener('input', (e) => {
        newPassword = e.target.value;
      });

      root.querySelector('#confirm-pass')?.addEventListener('input', (e) => {
        confirmPassword = e.target.value;
      });

      root.querySelector('#form-security')?.addEventListener('submit', handleSubmit);

      root.querySelector('.btn-cancel-security')?.addEventListener('click', () => {
        isOpen = false;
        errorMessage = '';
        render();
      });
    }
  }

  render();
}

