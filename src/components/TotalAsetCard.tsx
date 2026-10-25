import { useState } from 'react'
import type { AppState } from '../types'
import { formatIDR } from '../lib/money'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { translate, type Language } from '../lib/i18n'
import { EYE_OFF, EYE_OPEN } from './icons'

interface Props {
  state: AppState
  lang?: Language
}

export function TotalAsetCard({ state, lang = 'id' }: Props) {
  const [visible, setVisible] = useState(() => loadPrefs().asetVisible)

  const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  const toggle = () => {
    const next = !visible
    setVisible(next)
    savePrefs({ asetVisible: next })
  }

  const titleText = translate('aset.title', lang)
  const emptyText = translate('aset.empty', lang)
  const walletsText = translate('aset.walletsPrefix', lang, { count: state.wallets.length })
  const hideText = translate('aset.hide', lang)
  const showText = translate('aset.show', lang)

  return (
    <section className="card aset-card" aria-label={titleText}>
      <header className="card-head">
        <div>
          <h2>{titleText}</h2>
          <p className="aset-total">{visible ? formatIDR(total) : 'Rp ••••••'}</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm aset-eye"
          onClick={toggle}
          aria-label={visible ? hideText : showText}
          title={visible ? hideText : showText}
        >
          {visible ? EYE_OPEN : EYE_OFF}
        </button>
      </header>
      <p className="muted small" style={{ margin: 0 }}>
        {total > 0 ? walletsText : emptyText}
      </p>
    </section>
  )
}
