import { useState } from 'react'
import { reversePlan } from '../lib/reverse'
import { formatIDR, roundTo500 } from '../lib/money'
import { useI18n } from '../lib/i18n'
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
  const { language } = useI18n()
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
    if (!Number.isFinite(value)) return language === 'en' ? 'Cannot divide by zero' : 'Tidak bisa dibagi nol'
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
    setDisplay((prev) => (fresh || prev === '0' || prev.includes('bagi') || prev.includes('divide') ? key : `${prev}${key}`))
    setFresh(false)
  }

  const reverse = reversePlan({ target: revTarget, saved: revSaved, months: revMonths })

  return (
    <section className="card">
      <header className="card-head">
        <h2>{language === 'en' ? 'Calculator' : 'Kalkulator'}</h2>
        {mode === 'standar' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              onUseNumber(Math.round(Math.abs(current)))
              onClose?.()
            }}
            title={language === 'en' ? 'Use this number in allowance form' : 'Pakai angka ini di form uang jajan'}
          >
            {language === 'en' ? 'Use number' : 'Pakai angka'}
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
          {language === 'en' ? 'Standard' : 'Standar'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'terbalik'}
          className={`btn btn-ghost btn-sm${mode === 'terbalik' ? ' btn-active' : ''}`}
          onClick={() => setMode('terbalik')}
        >
          {language === 'en' ? 'Reverse' : 'Terbalik'}
        </button>
      </div>

      {mode === 'terbalik' ? (
        <div className="reverse">
          <p className="muted small">
            {language === 'en'
              ? 'Have a savings target and wondering how much to set aside per month? Calculate it automatically here!'
              : 'Punya target tapi bingung harus nyisihin berapa per bulan? Hitung otomatis di sini yuk!'}
          </p>
          <div className="field">
            <label htmlFor="rev-target">{language === 'en' ? 'Target (Rp)' : 'Target (Rp)'}</label>
            <MoneyInput id="rev-target" value={revTarget} onValueChange={setRevTarget} />
          </div>
          <div className="field">
            <label htmlFor="rev-saved">{language === 'en' ? 'Already saved (Rp)' : 'Sudah punya (Rp)'}</label>
            <MoneyInput id="rev-saved" value={revSaved} onValueChange={setRevSaved} />
          </div>
          <div className="field">
            <label htmlFor="rev-months">{language === 'en' ? 'Timeframe (months)' : 'Dalam waktu (bulan)'}</label>
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
                  <strong>{language === 'en' ? 'Target already achieved' : 'Target sudah tercapai'}</strong>
                </li>
              ) : (
                <>
                  <li>
                    <span>{language === 'en' ? 'Remaining needed' : 'Sisa yang dibutuhkan'}</span>
                    <strong>{formatIDR(reverse.gap)}</strong>
                  </li>
                  <li>
                    <span>{language === 'en' ? 'Monthly deposit' : 'Setoran per bulan'}</span>
                    <strong>{formatIDR(reverse.perMonth)}</strong>
                  </li>
                  <li>
                    <span>{language === 'en' ? 'Weekly deposit' : 'Setoran per minggu'}</span>
                    <strong>{formatIDR(reverse.perWeek)}</strong>
                  </li>
                  <li>
                    <span>{language === 'en' ? 'Daily deposit' : 'Setoran per hari'}</span>
                    <strong>{formatIDR(roundTo500(reverse.perDay))}</strong>
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
