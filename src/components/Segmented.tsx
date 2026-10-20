interface Props<T> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function Segmented<T>({ options, value, onChange }: Props<T>) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.label}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'selected' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
