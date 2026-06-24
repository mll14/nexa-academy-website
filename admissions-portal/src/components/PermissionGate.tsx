import { type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { ShieldOff } from 'lucide-react'

interface Props {
  permission: string
  /** Rendered when the user lacks the permission. Defaults to a subtle denied banner. */
  fallback?: ReactNode
  /** When true, renders nothing instead of the default denied banner. */
  silent?: boolean
  children: ReactNode
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <ShieldOff className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-sm">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this section.</p>
      </div>
    </div>
  )
}

export function PermissionGate({ permission, fallback, silent = false, children }: Props) {
  const { hasPermission } = useAuth()
  if (!hasPermission(permission)) {
    if (silent) return null
    return <>{fallback ?? <AccessDenied />}</>
  }
  return <>{children}</>
}
