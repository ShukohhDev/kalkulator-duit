import { useState, type FormEvent } from 'react'
import type { Notify } from '../types'
import { changePassword } from '../lib/auth'

interface Props {
  username: string
  notify: Notify
}

const LockIcon = () => (
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
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export function AccountSecurityCard({ username, notify }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!oldPassword) {
      setErrorMessage('Kata sandi saat ini harus diisi.')
      return
    }
    if (newPassword.length < 4) {
      setErrorMessage('Kata sandi baru minimal 4 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.')
      return
    }

    setLoading(true)
    const err = await changePassword(username, oldPassword, newPassword)
    setLoading(false)

    if (err) {
      setErrorMessage(err)
      notify(err, { error: true })
    } else {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsOpen(false)
      notify('Kata sandi akun berhasil diperbarui!')
    }
  }

  return (
    <section className="card account-security-card" aria-label="Keamanan Akun">
      <header className="card-head">
        <div className="security-title-wrap">
          <span className="security-icon">
            <LockIcon />
          </span>
          <div>
            <h3>Keamanan Akun</h3>
            <span className="muted small">Kelola kata sandi akun {username}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setIsOpen(!isOpen)
            setErrorMessage('')
          }}
        >
          {isOpen ? 'Tutup' : 'Ubah Kata Sandi'}
        </button>
      </header>

      {isOpen && (
        <form onSubmit={handleSubmit} className="security-form">
          <div className="field">
            <label htmlFor="old-pass">Kata Sandi Saat Ini</label>
            <input
              id="old-pass"
              className="input"
              type="password"
              placeholder="Masukkan kata sandi lama"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="field">
            <label htmlFor="new-pass">Kata Sandi Baru</label>
            <input
              id="new-pass"
              className="input"
              type="password"
              placeholder="Minimal 4 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirm-pass">Konfirmasi Kata Sandi Baru</label>
            <input
              id="confirm-pass"
              className="input"
              type="password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {errorMessage && <p className="text-danger small">{errorMessage}</p>}

          <div className="security-form-actions">
            <button type="submit" className="btn btn-sm" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setIsOpen(false)
                setErrorMessage('')
              }}
              disabled={loading}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
