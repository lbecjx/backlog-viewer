import { getStatusColorClasses } from '../lib/statusColor'

interface StatusChipProps {
  status: string
  active: boolean
  onClick: () => void
}

export function StatusChip({ status, active, onClick }: StatusChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${getStatusColorClasses(
        status,
      )} ${
        active
          ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 border-transparent'
          : 'border-transparent opacity-70 hover:opacity-100'
      }`}
    >
      {status}
    </button>
  )
}
