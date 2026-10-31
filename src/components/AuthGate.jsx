import { useState } from 'react';
import { accountNames, hasAccounts, login, register } from '../lib/auth';
import { loadState, saveState } from '../lib/storage';
import { appendActivity } from '../lib/activity';
import { getSupabaseClient } from '../lib/supabase';
import { pullStateFromCloud } from '../lib/cloudSync';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { translate, getDeviceLanguage, setDeviceLanguage } from '../lib/i18n';
import { EYE_OFF, EYE_OPEN } from './icons';
export function AuthGate({ onAuthed }) {
    const [lang, setLang] = useState(() => loadPrefs().language ?? getDeviceLanguage());
    const [mode, setMode] = useState(hasAccounts() ? 'masuk' : 'daftar');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const names = accountNames();
    const first = !hasAccounts();
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        setError('');
        setBusy(true);
        const failure = mode === 'daftar' ? await register(username, password) : await login(username, password);
        if (failure) {
            setBusy(false);
            setError(failure);
            return;
        }
        const name = username.trim();
        // Jika cloud aktif, tarik data pengguna dari cloud sebelum masuk ke aplikasi
        const supabase = getSupabaseClient();
        if (supabase) {
            try {
                const cloudRes = await pullStateFromCloud(name);
                if (cloudRes.success && cloudRes.state) {
                    const withActivity = appendActivity(cloudRes.state, 'login', `Masuk ke akun ${name}`);
                    saveState(withActivity);
                    setBusy(false);
                    onAuthed(name);
                    return;
                }
            }
            catch {
                // fallback ke penyimpanan lokal jika jaringan terkendala
            }
        }
        saveState(appendActivity(loadState(), 'login', `Masuk ke akun ${name}`));
        setBusy(false);
        onAuthed(name);
    }
    return (<div className="auth-gate">
      {/* Auth form card */}
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-top-actions">
          <button type="button" className="btn-lang-toggle" onClick={() => {
            const nextLang = lang === 'id' ? 'en' : 'id';
            setLang(nextLang);
            setDeviceLanguage(nextLang);
            savePrefs({ language: nextLang });
        }} aria-label={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'} title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}>
            <span className={`lang-choice${lang === 'id' ? ' lang-active' : ''}`}>ID</span>
            <span className="lang-sep">|</span>
            <span className={`lang-choice${lang === 'en' ? ' lang-active' : ''}`}>EN</span>
          </button>
        </div>
        <div className="auth-logo-wrap">
          <img src="/icon-192.png" alt="Logo Kalkulator Uang Jajan" className="auth-logo-img" width="64" height="64"/>
        </div>
        <h2 className="auth-title">{mode === 'daftar' ? (lang === 'en' ? 'Create Account' : 'Buat Akun') : translate('auth.welcome', lang)}</h2>
        <p className="auth-sub">
          {first
            ? translate('auth.tagline', lang)
            : mode === 'masuk'
                ? lang === 'en'
                    ? 'Sign in with your registered account.'
                    : 'Login dengan akun yang sudah anda daftarkan.'
                : lang === 'en'
                    ? 'Create a new account here, fast and simple!'
                    : 'Bikin akun baru di sini yuk, praktis dan cepat!'}
        </p>

        {/* Mode toggle */}
        <div className="auth-modes">
          <button type="button" className={`chip${mode === 'masuk' ? ' chip-on' : ''}`} onClick={() => {
            setMode('masuk');
            setError('');
        }}>
            {translate('auth.loginTab', lang)}
          </button>
          <button type="button" className={`chip${mode === 'daftar' ? ' chip-on' : ''}`} onClick={() => {
            setMode('daftar');
            setError('');
        }}>
            {translate('auth.registerTab', lang)}
          </button>
        </div>

        {/* Username */}
        <div className="field">
          <label htmlFor="auth-user">{lang === 'en' ? 'Username' : 'Nama pengguna'}</label>
          <input id="auth-user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" maxLength={24} autoFocus/>
        </div>

        {/* Password */}
        <div className="field">
          <label htmlFor="auth-pass">{lang === 'en' ? 'Password' : 'Kata sandi'}</label>
          <div className="pass-wrap">
            <input id="auth-pass" className="input" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}/>
            <button type="button" className="pass-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? (lang === 'en' ? 'Hide password' : 'Sembunyikan kata sandi') : (lang === 'en' ? 'Show password' : 'Tampilkan kata sandi')} title={showPass ? (lang === 'en' ? 'Hide password' : 'Sembunyikan kata sandi') : (lang === 'en' ? 'Show password' : 'Tampilkan kata sandi')}>
              {showPass ? EYE_OFF : EYE_OPEN}
            </button>
          </div>
        </div>

        {/* Error */}
        {error !== '' && <p className="auth-error">{error}</p>}

        {/* Submit */}
        <button className="btn auth-submit" type="submit" disabled={busy}>
          {busy
            ? lang === 'en'
                ? 'Processing…'
                : 'Memproses…'
            : mode === 'daftar'
                ? lang === 'en'
                    ? 'Create Account & Start'
                    : 'Buat Akun & Mulai'
                : translate('auth.loginBtn', lang)}
        </button>

        {/* Existing accounts */}
        {!first && names.length > 0 && (<div className="auth-existing">
            <span className="muted small">{lang === 'en' ? 'Accounts on this device:' : 'Akun di perangkat ini:'}</span>
            <div className="auth-names">
              {names.map((name) => (<button key={name} type="button" className="chip" onClick={() => {
                    setUsername(name);
                    setMode('masuk');
                    setError('');
                }}>
                  {name}
                </button>))}
            </div>
          </div>)}
      </form>
    </div>);
}
