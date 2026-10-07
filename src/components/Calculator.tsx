import { useState } from 'react'
import { reversePlan } from '../lib/reverse'
import { formatIDR } from '../lib/money'
import { MoneyInput } from './MoneyInput'

const KEYS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', ',', '='],
]

interface Props {
  onUseNumber: (value: number) => void
  onClose?: () => void
}

export function Calculator({ onUseNumber, onClose }: Props) {
  const [display, setDisplay] = useState('0')
  const [accumulator, setAccumulator] = useState<number | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true)
  const [mode, setMode] = useState<'standar' | 'terbalik'>('standar')
  const [revTarget, setRevTarget] = useState(0)
  const [revSaved, setRevSaved] = useState(0)
  const [revMonths, setRevMonths] = useState(12)

  const current = Number(display.replace(',', '.')) || 0

  const compute = (a: number, b: number, op: string): number => {
    if (op === '+') return a + b
    if (op === '−') return a - b
    if (op === '×') return a * b
    if (op === '÷') return b === 0 ? NaN : a / b
    return b
  }

  const show = (value: number) => {
    if (!Number.isFinite(value)) return 'Tidak bisa dibagi nol'
    const rounded = Math.round(value * 1e10) / 1e10
    return String(rounded).replace('.', ',')
  }

  const press = (key: string) => {
    if (key === 'C') {
      setDisplay('0')
      setAccumulator(null)
      setPending(null)
      setFresh(true)
      return
    }
    if (key === '±') {
      setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : prev === '0' ? prev : `-${prev}`))
      return
    }
    if (key === '%') {
      setDisplay(show(current / 100))
      setFresh(true)
      return
    }
    if (key === ',') {
      if (fresh) {
        setDisplay('0,')
        setFresh(false)
      } else if (!display.includes(',')) {
        setDisplay((prev) => `${prev},`)
      }
      return
    }
    if (['+', '−', '×', '÷'].includes(key)) {
      let value = current
      if (pending !== null && accumulator !== null && !fresh) {
        value = compute(accumulator, current, pending)
        setDisplay(show(value))
      }
      setAccumulator(value)
      setPending(key)
      setFresh(true)
      return
    }
    if (key === '=') {
      if (pending !== null && accumulator !== null) {
        const value = compute(accumulator, current, pending)
        setDisplay(show(value))
        setAccumulator(null)
        setPending(null)
        setFresh(true)
      }
      return
    }
    setDisplay((prev) => (fresh || prev === '0' || prev.includes('bagi') ? key : `${prev}${key}`))
    setFresh(false)
  }

  const reverse = reversePlan({ target: revTarget, saved: revSaved, months: revMonths })

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kalkulator</h2>
        {mode === 'standar' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              onUseNumber(Math.round(Math.abs(current)))
              onClose?.()
            }}
            title="Pakai angka ini di form uang jajan"
          >
            Pakai angka
          </button>
        )}
      </header>

      <div className="calc-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'standar'}
          className={`btn btn-ghost btn-sm${mode === 'standar' ? ' btn-active' : ''}`}
          onClick={() => setMode('standar')}
        >
          Standar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'terbalik'}
          className={`btn btn-ghost btn-sm${mode === 'terbalik' ? ' btn-active' : ''}`}
          onClick={() => setMode('terbalik')}
        >
          Terbalik
        </button>
      </div>

      {mode === 'terbalik' ? (
        <div className="reverse">
          <p className="muted small">
            Dari target dan tenggat, berapa yang harus disisihkan tiap bulan? Dibagi rata tanpa bunga.
          </p>
          <div className="field">
            <label htmlFor="rev-target">Target (Rp)</label>
            <MoneyInput id="rev-target" value={revTarget} onValueChange={setRevTarget} />
          </div>
          <div className="field">
            <label htmlFor="rev-saved">Sudah punya (Rp)</label>
            <MoneyInput id="rev-saved" value={revSaved} onValueChange={setRevSaved} />
          </div>
          <div className="field">
            <label htmlFor="rev-months">Dalam waktu (bulan)</label>
            <input
              id="rev-months"
              className="input"
              type="number"
              min={1}
              max={600}
              value={revMonths}
              onChange={(e) => setRevMonths(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          {reverse !== null && (
            <ul className="rec-list">
              {reverse.achieved ? (
                <li>
                  <span>Status</span>
                  <strong>Target sudah tercapai</strong>
                </li>
              ) : (
                <>
                  <li>
                    <span>Sisa yang dibutuhkan</span>
                    <strong>{formatIDR(reverse.gap)}</strong>
                  </li>
                  <li>
                    <span>Setoran per bulan</span>
                    <strong>{formatIDR(reverse.perMonth)}</strong>
                  </li>
                  <li>
                    <span>Setoran per minggu</span>
                    <strong>{formatIDR(reverse.perWeek)}</strong>
                  </li>
                  <li>
                    <span>Setoran per hari</span>
                    <strong>{formatIDR(reverse.perDay)}</strong>
                  </li>
                </>
              )}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="calc-display" aria-live="polite">
            {display}
          </div>

          <div className="calc-keys">
            {KEYS.flat().map((key) => (
              <button
                key={key}
                type="button"
                className={`calc-key${['÷', '×', '−', '+', '='].includes(key) ? ' calc-op' : ''}${key === 'C' ? ' calc-clear' : ''}`}
                onClick={() => press(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
