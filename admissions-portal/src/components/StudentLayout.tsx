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
  PanelLeftClose,
  User,
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
  { to: '/student/profile', label: 'Profile', icon: User },
]

export function StudentLayout({ children, unreadCount }: Props) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const isActive = (to: string) => pathname === to
  const activeLabel = STUDENT_NAV.find(n => pathname.startsWith(n.to))?.label ?? ''

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'group/sidebar fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-200',
          'w-64 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 h-16 border-b border-border shrink-0 px-3',
            sidebarCollapsed ? 'lg:justify-center lg:cursor-pointer' : 'justify-between',
          )}
          onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
          title={sidebarCollapsed ? 'Expand sidebar' : undefined}
        >
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="h-8 w-auto object-contain shrink-0"
          />
          <span className={cn('font-heading text-sm font-bold text-foreground whitespace-nowrap flex-1 min-w-0', sidebarCollapsed && 'lg:hidden')}>
            Nexa Student
          </span>
          <div className={cn('flex items-center gap-1 shrink-0', sidebarCollapsed && 'lg:hidden')}>
            <button
              className="lg:hidden p-1 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(false) }}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(true) }}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className={cn('flex-1 overflow-y-auto', sidebarCollapsed ? 'lg:p-2 p-4' : 'p-4')}>
          <div className="space-y-1">
            {STUDENT_NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  sidebarCollapsed && 'lg:justify-center lg:px-0 lg:py-2.5',
                  isActive(to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={cn(sidebarCollapsed && 'lg:hidden')}>
                  {label}
                </span>
                {!sidebarCollapsed && (
                  label === 'Notifications' && unreadCount && unreadCount > 0 ? (
                    <span className="ml-auto text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : isActive(to) ? (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                  ) : null
                )}
              </Link>
            ))}
          </div>
        </nav>

        <div className={cn('border-t border-border', sidebarCollapsed ? 'lg:p-2 p-4' : 'p-4')}>
          <div className={cn('flex items-center gap-3 px-2 py-2', sidebarCollapsed && 'lg:flex-col lg:px-0 lg:gap-2')}>
            <Link
              to="/student/profile"
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? 'Profile' : undefined}
              className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 hover:bg-primary/25 transition-colors"
            >
              <span className="text-xs font-bold text-primary">
                {(user?.display_name || user?.email || 'S').charAt(0).toUpperCase()}
              </span>
            </Link>
            <Link
              to="/student/profile"
              onClick={() => setSidebarOpen(false)}
              className={cn('flex-1 min-w-0 hover:opacity-80 transition-opacity', sidebarCollapsed && 'lg:hidden')}
            >
              <p className="text-xs font-medium truncate">{user?.display_name || 'Student'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </Link>
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

      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-200', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src="/nexa-academy-small-logo.png"
              alt="Nexa Academy"
              className="h-7 w-auto object-contain shrink-0"
            />
            {activeLabel && <span className="text-sm font-semibold truncate">{activeLabel}</span>}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 pt-20 lg:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
