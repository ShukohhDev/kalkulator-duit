import { useState } from 'react'
import type { AppState } from '../types'
import { formatIDR } from '../lib/money'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { EYE_OFF, EYE_OPEN } from './icons'

interface Props {
  state: AppState
}

export function TotalAsetCard({ state }: Props) {
  const [visible, setVisible] = useState(() => loadPrefs().asetVisible)

  const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  const toggle = () => {
    const next = !visible
    setVisible(next)
    savePrefs({ asetVisible: next })
  }

  return (
    <section className="card aset-card" aria-label="Total aset">
      <header className="card-head">
        <div>
          <h2>Total Aset</h2>
          <p className="aset-total">{visible ? formatIDR(total) : 'Rp ••••••'}</p>
        </div>
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
      <p className="muted small" style={{ margin: 0 }}>
        {total > 0
          ? `Dari ${state.wallets.length} sumber (rekening, e-wallet, tunai)`
          : 'Belum ada saldo. Isi lewat panel Dompet & e-wallet di menu Tabungan.'}
      </p>
    </section>
  )
}
