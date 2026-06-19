import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface Props {
  children: React.ReactNode
  unreadCount?: number
}

const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/application', label: 'Application', icon: FileText },
  { to: '/student/payments', label: 'Payments', icon: CreditCard },
  { to: '/student/notifications', label: 'Notifications', icon: Bell },
]

export function StudentLayout({ children, unreadCount }: Props) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const isActive = (to: string) => pathname === to
  const activeLabel = STUDENT_NAV.find(n => pathname.startsWith(n.to))?.label ?? ''

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
          <Link to="/student/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2">
            <img
              src="/nexa-academy-small-logo.png"
              alt="Nexa Academy"
              className="h-8 w-auto object-contain"
            />
            <span className="font-heading text-sm font-bold text-foreground">Nexa Student</span>
          </Link>
          <button
            className="lg:hidden p-1 rounded hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {STUDENT_NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive(to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {label === 'Notifications' && unreadCount && unreadCount > 0 ? (
                  <span className="ml-auto text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : isActive(to) ? (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                ) : null}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {(user?.display_name || user?.email || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.display_name || 'Student'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logout('/login')}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src="/nexa-academy-logo.png"
              alt="Nexa Academy"
              className="h-7 w-auto object-contain shrink-0"
            />
            {activeLabel && <span className="text-sm font-semibold truncate">{activeLabel}</span>}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
