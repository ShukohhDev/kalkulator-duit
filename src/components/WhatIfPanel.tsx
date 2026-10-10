import { useState } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { whatIf } from '../lib/whatif'
import { formatIDR } from '../lib/money'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  derived: Derived
}

const ALLOWANCE_STEPS = [0, -30, -20, -10, 10, 20, 30]
const PACE_STEPS = [-30, -20, -10, 0, 10, 20]

export function WhatIfPanel({ state, derived }: Props) {
  const [allowancePct, setAllowancePct] = useState(0)
  const [pacePct, setPacePct] = useState(0)

  const result = whatIf(state, derived, { allowancePct, pacePct })
  if (!result) return null

  const endLabel =
    result.projectedEnd >= 0
      ? `Sisa ${formatIDR(result.projectedEnd)}`
      : `Kurang ${formatIDR(-result.projectedEnd)}`
  const delta = result.projectedEnd - result.currentEnd

  return (
    <section className="card whatif-card">
      <header className="card-head">
        <h2>Bagaimana Kalau</h2>
        <span className="muted small">simulasi saja (tidak mengubah data kamu)</span>
      </header>

      <div className="form-grid form-grid-2">
        <div className="field">
          <label htmlFor="whatif-allowance">Uang jajan berubah</label>
          <CustomSelect
            id="whatif-allowance"
            className="input"
            value={allowancePct}
            onChange={(e) => setAllowancePct(Number(e.target.value))}
            title="Pilih Perubahan Uang Jajan"
          >
            {ALLOWANCE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step === 0 ? 'Tetap (100%)' : `${step > 0 ? '+' : ''}${step}%`}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="whatif-pace">Laju pengeluaran</label>
          <CustomSelect
            id="whatif-pace"
            className="input"
            value={pacePct}
            onChange={(e) => setPacePct(Number(e.target.value))}
            title="Pilih Laju Pengeluaran"
          >
            {PACE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step === 0 ? 'Sama seperti sekarang' : `${step > 0 ? 'naik' : 'turun'} ${Math.abs(step)}%`}
              </option>
            ))}
          </CustomSelect>
        </div>
      </div>

      <ul className="rec-list">
        <li>
          <span>Uang jajan skenario</span>
          <strong>{formatIDR(result.allowance)}</strong>
        </li>
        <li>
          <span>Proyeksi pengeluaran akhir periode</span>
          <strong>{formatIDR(result.projectedExpense)}</strong>
        </li>
        <li>
          <span>Perkiraan saat periode berakhir</span>
          <strong className={result.projectedEnd < 0 ? 'text-danger' : undefined}>{endLabel}</strong>
        </li>
        <li>
          <span>Boleh belanja per hari</span>
          <strong>{formatIDR(result.perDay)}</strong>
        </li>
      </ul>
      {Math.abs(delta) >= 1 && (
        <p className="muted small">
          {delta > 0 ? 'Lebih aman' : 'Lebih ketat'} {formatIDR(Math.abs(delta))} dibanding skenario sekarang.
        </p>
      )}
    </section>
  )
}
