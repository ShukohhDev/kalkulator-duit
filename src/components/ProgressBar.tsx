interface Props {
  value: number
  max: number
}

export function ProgressBar({ value, max }: Props) {
  const ratio = max > 0 ? value / max : 0
  const percent = Math.min(100, Math.max(0, ratio * 100))
  const over = ratio > 1

  return (
    <div className={`bar${over ? ' bar-over' : ''}`} role="progressbar" aria-valuenow={Math.round(percent)}>
      <div className="bar-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
