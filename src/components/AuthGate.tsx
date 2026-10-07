import { useState, type FormEvent } from 'react'
import { accountNames, hasAccounts, login, register } from '../lib/auth'
import { loadState, saveState } from '../lib/storage'
import { appendActivity } from '../lib/activity'
import { EYE_OFF, EYE_OPEN } from './icons'

interface AuthGateProps {
  onAuthed: (username: string) => void
}

export function AuthGate({ onAuthed }: AuthGateProps) {
  const [mode, setMode] = useState<'masuk' | 'daftar'>(hasAccounts() ? 'masuk' : 'daftar')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const names = accountNames()
  const first = !hasAccounts()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const failure = mode === 'daftar' ? await register(username, password) : await login(username, password)
    setBusy(false)
    if (failure) {
      setError(failure)
      return
    }
    const name = username.trim()
    saveState(appendActivity(loadState(), 'login', `Masuk ke akun ${name}`))
    onAuthed(name)
  }

  return (
    <div className="auth-gate">
      {/* Auth form card */}
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="auth-title">{mode === 'daftar' ? 'Buat Akun' : 'Selamat Datang'}</h2>
        <p className="auth-sub">
          {first
            ? 'Buat akun untuk memisahkan data tiap pengguna di perangkat ini.'
            : mode === 'masuk'
            ? 'Masuk dulu supaya datamu terpisah dengan pengguna lain.'
            : 'Daftarkan akun baru di perangkat ini.'}
        </p>

        {/* Mode toggle */}
        <div className="auth-modes">
          <button
            type="button"
            className={`chip${mode === 'masuk' ? ' chip-on' : ''}`}
            onClick={() => {
              setMode('masuk')
              setError('')
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            className={`chip${mode === 'daftar' ? ' chip-on' : ''}`}
            onClick={() => {
              setMode('daftar')
              setError('')
            }}
          >
            Daftar
          </button>
        </div>

        {/* Username */}
        <div className="field">
          <label htmlFor="auth-user">Nama pengguna</label>
          <input
            id="auth-user"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={24}
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="field">
          <label htmlFor="auth-pass">Kata sandi</label>
          <div className="pass-wrap">
            <input
              id="auth-pass"
              className="input"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              className="pass-eye"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              title={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPass ? EYE_OFF : EYE_OPEN}
            </button>
          </div>
        </div>

        {/* Error */}
        {error !== '' && <p className="auth-error">{error}</p>}

        {/* Submit */}
        <button className="btn auth-submit" type="submit" disabled={busy}>
          {busy ? 'Memproses…' : mode === 'daftar' ? 'Buat Akun & Mulai' : 'Masuk Sekarang'}
        </button>

        {/* Existing accounts */}
        {!first && names.length > 0 && (
          <div className="auth-existing">
            <span className="muted small">Akun di perangkat ini:</span>
            <div className="auth-names">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setUsername(name)
                    setMode('masuk')
                    setError('')
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
