interface Props {
  id: string
  value: number
  onChange: (day: number) => void
}

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

export function MiniCalendar({ id, value, onChange }: Props) {
  return (
    <div className="field">
      <label id={`${id}-label`}>Tgl jatuh tempo (1-31)</label>
      <div id={id} className="mini-cal" role="radiogroup" aria-labelledby={`${id}-label`}>
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            data-day={day}
            role="radio"
            aria-checked={value === day}
            aria-label={`Tanggal ${day}`}
            className={`mini-day${value === day ? ' mini-day-on' : ''}`}
            onClick={() => onChange(day)}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  )
}
