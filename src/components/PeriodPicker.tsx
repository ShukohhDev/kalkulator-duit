import { useState } from 'react'
import type { PeriodMode, ProfileId } from '../types'
import { PROFILES } from '../lib/profiles'
import { loadPrefs, savePrefs } from '../lib/prefs'

interface Props {
  current: PeriodMode | null
  onPick: (mode: PeriodMode) => void
  onCancel?: () => void
  profile?: ProfileId
  onApplyProfile?: (id: ProfileId) => void
}

const OPTIONS: { mode: PeriodMode; title: string; desc: string }[] = [
  {
    mode: 'week',
    title: '1 Minggu',
    desc: 'Uang jajan yang kamu terima tiap minggu',
  },
  {
    mode: 'month',
    title: '1 Bulan',
    desc: 'Uang jajan yang kamu terima tiap bulan',
  },
]

const WIZARD_DESC: Record<ProfileId, string> = {
  'tinggal-rumah': 'Ada jatah kebutuhan rumah: listrik, belanja, internet.',
  'tinggal-kos': 'Fokus anak kos: laundry, WiFi, makan di luar.',
}

export function PeriodPicker({ current, onPick, onCancel, profile, onApplyProfile }: Props) {
  const onboard = current === null
  const [profilePicked, setProfilePicked] = useState(() => loadPrefs().profilePicked)

  const pickProfile = (id: ProfileId, label: string) => {
    if (id === profile) return
    if (!window.confirm(`Terapkan profil ${label}? Rasio alokasi akan diganti sesuai profil ini (kamu tetap bisa mengubahnya).`)) return
    onApplyProfile?.(id)
  }

  return (
    <div className={`overlay${onboard ? ' overlay-onboard' : ''}`} role="dialog" aria-modal="true">
      <div className="overlay-card">
        <h1 className="overlay-title">{onboard ? 'Kalkulator Uang Jajan' : 'Ganti periode uang jajan'}</h1>
        <p className="overlay-sub">
          {onboard
            ? 'Pilih dulu uang jajan kamu masuknya tiap apa, supaya alokasinya sesuai.'
            : 'Alokasi dan pemasukan otomatis akan ikut menyesuaikan.'}
        </p>

        {onboard && !profilePicked && (
          <div className="wizard-step">
            <p className="profile-label">Langkah 1: kamu tinggal di mana?</p>
            <div className="wizard-cards">
              {PROFILES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wizard-card${profile === item.id ? ' wizard-card-on' : ''}`}
                  onClick={() => {
                    onApplyProfile?.(item.id)
                    savePrefs({ profilePicked: true })
                    setProfilePicked(true)
                  }}
                >
                  <strong className="wizard-card-title">{item.label}</strong>
                  <span className="muted small">{WIZARD_DESC[item.id]}</span>
                </button>
              ))}
            </div>
            <p className="profile-label">Langkah 2: uang jajan kamu masuknya tiap apa?</p>
          </div>
        )}

        <div className="period-options">
          {OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              className={`period-option${current === option.mode ? ' period-option-active' : ''}`}
              onClick={() => onPick(option.mode)}
            >
              <span className="period-option-title">{option.title}</span>
              <span className="period-option-desc">{option.desc}</span>
            </button>
          ))}
        </div>

        {!onboard && (
          <div className="profile-block">
            <p className="profile-label">Profil alokasi</p>
            <div className="profile-chips">
              {PROFILES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`profile-chip${profile === item.id ? ' profile-chip-on' : ''}`}
                  onClick={() => pickProfile(item.id, item.label)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="muted small">Ganti profil menukar rasio alokasi; data transaksi tetap aman.</p>
          </div>
        )}

        {!onboard && onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Batal
          </button>
        )}
      </div>
    </div>
  )
}
