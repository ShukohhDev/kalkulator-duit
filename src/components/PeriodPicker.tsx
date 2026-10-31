import { useEffect, useState } from 'react'
import type { PeriodMode, ProfileId } from '../types'
import { PROFILES } from '../lib/profiles'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { useI18n } from '../lib/i18n'
import { lockBodyScroll } from '../lib/scrollLock'

interface Props {
  current: PeriodMode | null
  onPick: (mode: PeriodMode) => void
  onCancel?: () => void
  profile?: ProfileId
  onApplyProfile?: (id: ProfileId) => void
}

const WIZARD_DESC: Record<ProfileId, { id: string; en: string }> = {
  'tinggal-rumah': {
    id: 'Ada jatah kebutuhan rumah: listrik, belanja, internet.',
    en: 'Includes household bills: utilities, groceries, internet.',
  },
  'tinggal-kos': {
    id: 'Fokus anak kos: laundry, WiFi, makan di luar.',
    en: 'Focus on dorm life: laundry, WiFi, dining out.',
  },
}

export function PeriodPicker({ current, onPick, onCancel, profile, onApplyProfile }: Props) {
  const { language } = useI18n()
  const onboard = current === null
  const [profilePicked, setProfilePicked] = useState(() => loadPrefs().profilePicked)

  useEffect(() => {
    return lockBodyScroll()
  }, [])

  const pickProfile = (id: ProfileId, label: string) => {
    if (id === profile) return
    const confirmMsg =
      language === 'en'
        ? `Apply profile "${label}"? Budget ratios will update to match (you can still customize them later).`
        : `Terapkan profil ${label}? Rasio alokasi akan diganti sesuai profil ini (kamu tetap bisa mengubahnya).`
    if (!window.confirm(confirmMsg)) return
    onApplyProfile?.(id)
  }

  const options: { mode: PeriodMode; title: string; desc: string }[] = [
    {
      mode: 'week',
      title: language === 'en' ? '1 Week' : '1 Minggu',
      desc: language === 'en' ? 'Allowance received every week' : 'Uang jajan yang kamu terima tiap minggu',
    },
    {
      mode: 'month',
      title: language === 'en' ? '1 Month' : '1 Bulan',
      desc: language === 'en' ? 'Allowance received every month' : 'Uang jajan yang kamu terima tiap bulan',
    },
  ]

  return (
    <div className={`overlay${onboard ? ' overlay-onboard' : ''}`} role="dialog" aria-modal="true">
      <div className="overlay-card">
        <h1 className="overlay-title">
          {onboard ? 'Kalkulator Uang Jajan' : language === 'en' ? 'Change allowance period' : 'Ganti periode uang jajan'}
        </h1>
        <p className="overlay-sub">
          {onboard
            ? language === 'en'
              ? 'Choose how often you receive your allowance so we can budget accurately.'
              : 'Pilih dulu uang jajan kamu masuknya tiap apa, supaya alokasinya sesuai.'
            : language === 'en'
            ? 'Budget allocations and recurring income will adjust automatically.'
            : 'Alokasi dan pemasukan otomatis akan ikut menyesuaikan.'}
        </p>

        {onboard && !profilePicked && (
          <div className="wizard-step">
            <p className="profile-label">
              {language === 'en' ? 'Step 1: Where do you live?' : 'Langkah 1: kamu tinggal di mana?'}
            </p>
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
                  <span className="muted small">{WIZARD_DESC[item.id][language]}</span>
                </button>
              ))}
            </div>
            <p className="profile-label">
              {language === 'en' ? 'Step 2: How often do you receive your allowance?' : 'Langkah 2: uang jajan kamu masuknya tiap apa?'}
            </p>
          </div>
        )}

        <div className="period-options">
          {options.map((option) => (
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
            <p className="profile-label">{language === 'en' ? 'Allocation profile' : 'Profil alokasi'}</p>
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
            <p className="muted small">
              {language === 'en'
                ? 'Switching profiles adjusts allocation ratios; transaction data stays safe.'
                : 'Ganti profil menukar rasio alokasi; data transaksi tetap aman.'}
            </p>
          </div>
        )}

        {!onboard && onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {language === 'en' ? 'Cancel' : 'Batal'}
          </button>
        )}
      </div>
    </div>
  )
}
