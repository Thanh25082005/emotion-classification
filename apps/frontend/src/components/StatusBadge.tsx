import { ServiceStatus } from '@/types'

const STATUS_CONFIG: Record<ServiceStatus, { label: string; className: string }> = {
  online: { label: 'Online', className: 'bg-green-100 text-green-800' },
  offline: { label: 'Offline', className: 'bg-red-100 text-red-800' },
  unknown: { label: 'Unknown', className: 'bg-gray-100 text-gray-800' },
}

export default function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  )
}
