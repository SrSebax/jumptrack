import { Minus, Plus } from 'lucide-react'

interface Props {
  label: string
  value: string
  onMinus: () => void
  onPlus: () => void
}

export function Stepper({ label, value, onMinus, onPlus }: Props) {
  return (
    <div className="card stepper">
      <div>
        <div className="stepper-label">{label}</div>
        <div className="stepper-value">{value}</div>
      </div>
      <button className="step-btn" onClick={onMinus} aria-label={`Menos ${label.toLowerCase()}`}>
        <Minus size={22} />
      </button>
      <button className="step-btn" onClick={onPlus} aria-label={`Más ${label.toLowerCase()}`}>
        <Plus size={22} />
      </button>
    </div>
  )
}
