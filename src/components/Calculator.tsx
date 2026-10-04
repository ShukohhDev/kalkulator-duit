import { useState } from 'react'

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

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kalkulator</h2>
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
      </header>

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
    </section>
  )
}
