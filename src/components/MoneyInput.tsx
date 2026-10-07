import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  onValueChange: (value: number) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  onBlur?: () => void
}

const group = (value: number) => (value > 0 ? value.toLocaleString('id-ID') : '')

export function MoneyInput({ value, onValueChange, id, placeholder = '0', autoFocus, disabled, onBlur }: Props) {
  const [text, setText] = useState(() => group(value))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setText(group(value))
  }, [value])

  return (
    <input
      id={id}
      className="input input-money"
      type="text"
      inputMode="numeric"
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        editing.current = true
      }}
      onBlur={() => {
        editing.current = false
        setText(group(value))
        onBlur?.()
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '')
        const next = digits ? Number(digits) : 0
        setText(group(next))
        onValueChange(next)
      }}
    />
  )
}
