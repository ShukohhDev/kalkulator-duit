/**
 * Authentication Gate (Pure Vanilla JS)
 */
import { accountNames, hasAccounts, login, register } from '../lib/auth.js';
import { loadState, saveState } from '../lib/storage.js';
import { appendActivity } from '../lib/activity.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { pullStateFromCloud } from '../lib/cloudSync.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { translate, getDeviceLanguage, setDeviceLanguage } from '../lib/i18n.js';
import { EYE_OFF, EYE_OPEN } from './icons.js';
import { escapeHtml } from '../lib/dom.js';

export function renderAuthGate(container, { onAuthed }) {
  if (!container) return;

  let lang = loadPrefs().language ?? getDeviceLanguage();
  let mode = hasAccounts() ? 'masuk' : 'daftar';
  let username = '';
  let password = '';
  let showPass = false;
  let error = '';
  let busy = false;

  function render() {
    const isEn = lang === 'en';
    const first = !hasAccounts();
    const names = accountNames();

    container.innerHTML = `
      <div class="auth-gate">
        <form class="card auth-card">
          <div class="auth-top-actions">
            <button
              type="button"
              class="btn-lang-toggle"
              aria-label="${isEn ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}"
              title="${isEn ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}"
            >
              <span class="lang-choice${lang === 'id' ? ' lang-active' : ''}">ID</span>
              <span class="lang-sep">|</span>
              <span class="lang-choice${lang === 'en' ? ' lang-active' : ''}">EN</span>
            </button>
          </div>
          <div class="auth-logo-wrap">
            <img src="/icon-192.png" alt="Logo Kalkulator Uang Jajan" class="auth-logo-img" width="64" height="64" />
          </div>
          <h2 class="auth-title">
            ${mode === 'daftar' ? (isEn ? 'Create Account' : 'Buat Akun') : translate('auth.welcome', lang)}
          </h2>
          <p class="auth-sub">
            ${
              first
                ? translate('auth.tagline', lang)
                : mode === 'masuk'
                ? isEn
                  ? 'Sign in with your registered account.'
                  : 'Login dengan akun yang sudah anda daftarkan.'
                : isEn
                ? 'Create a new account here, fast and simple!'
                : 'Bikin akun baru di sini yuk, praktis dan cepat!'
            }
          </p>

          <div class="auth-modes">
            <button type="button" class="chip btn-mode-masuk${mode === 'masuk' ? ' chip-on' : ''}">
              ${translate('auth.loginTab', lang)}
            </button>
            <button type="button" class="chip btn-mode-daftar${mode === 'daftar' ? ' chip-on' : ''}">
              ${translate('auth.registerTab', lang)}
            </button>
          </div>

          <div class="field">
            <label for="auth-user">${isEn ? 'Username' : 'Nama pengguna'}</label>
            <input
              id="auth-user"
              class="input"
              value="${escapeHtml(username)}"
              autocomplete="username"
              maxlength="24"
            />
          </div>

          <div class="field">
            <label for="auth-pass">${isEn ? 'Password' : 'Kata sandi'}</label>
            <div class="pass-wrap">
              <input
                id="auth-pass"
                class="input"
                type="${showPass ? 'text' : 'password'}"
                value="${escapeHtml(password)}"
                autocomplete="${mode === 'daftar' ? 'new-password' : 'current-password'}"
              />
              <button
                type="button"
                class="pass-eye"
                aria-label="${showPass ? (isEn ? 'Hide password' : 'Sembunyikan kata sandi') : (isEn ? 'Show password' : 'Tampilkan kata sandi')}"
                title="${showPass ? (isEn ? 'Hide password' : 'Sembunyikan kata sandi') : (isEn ? 'Show password' : 'Tampilkan kata sandi')}"
              >
                ${showPass ? EYE_OFF : EYE_OPEN}
              </button>
            </div>
          </div>

          ${error !== '' ? `<p class="auth-error">${escapeHtml(error)}</p>` : ''}

          <button class="btn auth-submit" type="submit"${busy ? ' disabled' : ''}>
            ${
              busy
                ? isEn
                  ? 'Processing…'
                  : 'Memproses…'
                : mode === 'daftar'
                ? isEn
                  ? 'Register & Get Started'
                  : 'Daftar & Mulai'
                : isEn
                ? 'Sign In'
                : 'Masuk'
            }
          </button>

          ${!first && names.length > 0 ? `
            <div class="auth-existing">
              <span class="muted small">${isEn ? 'Accounts on this device:' : 'Akun di perangkat ini:'}</span>
              <div class="auth-names">${names.map((name) => `<button type="button" class="chip btn-pick-account" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div>
            </div>
          ` : ''}
        </form>
      </div>
    `;

    // Event bindings
    const form = container.querySelector('.auth-card');
    const userInput = container.querySelector('#auth-user');
    const passInput = container.querySelector('#auth-pass');
    const eyeBtn = container.querySelector('.pass-eye');
    const langBtn = container.querySelector('.btn-lang-toggle');
    const masukBtn = container.querySelector('.btn-mode-masuk');
    const daftarBtn = container.querySelector('.btn-mode-daftar');

    userInput?.addEventListener('input', (e) => {
      username = e.target.value;
    });

    passInput?.addEventListener('input', (e) => {
      password = e.target.value;
    });

    eyeBtn?.addEventListener('click', () => {
      showPass = !showPass;
      render();
    });

    langBtn?.addEventListener('click', () => {
      lang = lang === 'id' ? 'en' : 'id';
      setDeviceLanguage(lang);
      savePrefs({ language: lang });
      render();
    });

    masukBtn?.addEventListener('click', () => {
      mode = 'masuk';
      error = '';
      render();
    });

    daftarBtn?.addEventListener('click', () => {
      mode = 'daftar';
      error = '';
      render();
    });

    container.querySelectorAll('.btn-pick-account').forEach((btn) => {
      btn.addEventListener('click', () => {
        username = btn.getAttribute('data-name') || '';
        mode = 'masuk';
        error = '';
        render();
      });
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const u = (form.querySelector('#auth-user')?.value || username).trim();
      const p = form.querySelector('#auth-pass')?.value || password;
      username = u;
      password = p;
      error = '';
      busy = true;
      const submitBtn = form.querySelector('.auth-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isEn ? 'Processing…' : 'Memproses…';
      }

      const failure = mode === 'daftar' ? await register(u, p) : await login(u, p);
      if (failure) {
        busy = false;
        error = failure;
        render();
        return;
      }

      const name = u;
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const cloudRes = await pullStateFromCloud(name);
          if (cloudRes.success && cloudRes.state) {
            const withActivity = appendActivity(cloudRes.state, 'login', `Masuk ke akun ${name}`);
            saveState(withActivity);
            busy = false;
            onAuthed(name);
            return;
          }
        } catch {
          // fallback ke penyimpanan lokal
        }
      }

      saveState(appendActivity(loadState(), 'login', `Masuk ke akun ${name}`));
      busy = false;
      onAuthed(name);
    });
  }

  render();
}
