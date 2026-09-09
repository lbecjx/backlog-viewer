import { getLabelColorClasses } from '../lib/labelColor'

interface LabelBadgeProps {
  label: string
}

export function LabelBadge({ label }: LabelBadgeProps) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${getLabelColorClasses(label)}`}>
      {label}
    </span>
  )
}
