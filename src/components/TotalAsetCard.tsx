import { useState } from 'react'
import type { AppState } from '../types'
import { formatIDR } from '../lib/money'
import { loadPrefs, savePrefs } from '../lib/prefs'

interface Props {
  state: AppState
}

const EYE_OPEN = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EYE_OFF = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <path d="M1 1l22 22" />
  </svg>
)

export function TotalAsetCard({ state }: Props) {
  const [visible, setVisible] = useState(() => loadPrefs().asetVisible)

  const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  const toggle = () => {
    const next = !visible
    setVisible(next)
    savePrefs({ asetVisible: next })
  }

  return (
    <section className="card aset-card">
      <header className="card-head">
        <h2>Total Aset</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm aset-eye"
          onClick={toggle}
          aria-label={visible ? 'Sembunyikan total aset' : 'Tampilkan total aset'}
          title={visible ? 'Sembunyikan total aset' : 'Tampilkan total aset'}
        >
          {visible ? EYE_OPEN : EYE_OFF}
        </button>
      </header>
      <p className="aset-total">{visible ? formatIDR(total) : 'Rp ••••••'}</p>
      <p className="muted small">
        {total > 0
          ? `Dari ${state.wallets.length} kartu saku (rekening, e-wallet, tunai)`
          : 'Belum ada saldo. Isi lewat panel Dompet & e-wallet di menu Tabungan.'}
      </p>
    </section>
  )
}
