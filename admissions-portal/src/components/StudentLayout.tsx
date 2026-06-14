import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface Props {
  children: React.ReactNode
}

export function StudentLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur flex items-center px-4 sm:px-6 gap-3">
        {/* Logo */}
        <Link to="/student/dashboard" className="flex items-center gap-2 shrink-0">
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="h-7 w-auto object-contain"
          />
          <span className="font-heading text-sm font-bold text-foreground hidden sm:block">
            Nexa Academy
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-border hidden sm:block" />

        <nav className="flex-1 flex items-center gap-1">
          <Link
            to="/student/dashboard"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/student/dashboard'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {(user?.display_name || user?.email || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium max-w-[140px] truncate">
              {user?.display_name || user?.email?.split('@')[0]}
            </span>
          </div>
          {/* Mobile avatar */}
          <div className="sm:hidden w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {(user?.display_name || user?.email || 'S').charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => logout('/login')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
