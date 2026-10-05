import type { PeriodMode, ProfileId } from '../types'
import { PROFILES } from '../lib/profiles'

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

export function PeriodPicker({ current, onPick, onCancel, profile, onApplyProfile }: Props) {
  const onboard = current === null

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
