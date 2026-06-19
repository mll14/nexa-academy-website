import { useState, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  BookOpen,
  GraduationCap,
  Flame,
  MessageSquare,
  Mail,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  Bell,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getNotifications } from '../lib/api'
import { cn } from '../lib/utils'

const PRIMARY_NAV = [
  { to: '/admin',              label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { to: '/admin/applications', label: 'Applications',     icon: Users },
  { to: '/admin/interviews',   label: 'Interviews',       icon: Calendar },
  { to: '/admin/programs',     label: 'Programs & Intakes', icon: BookOpen },
  { to: '/admin/enrolled',     label: 'Enrolled Students', icon: GraduationCap },
]

const MORE_NAV = [
  { to: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/admin/payment-plans', label: 'Payment Plans', icon: CreditCard },
  { to: '/admin/leads',        label: 'Leads',        icon: Flame },
  { to: '/admin/messages',     label: 'Messages',     icon: MessageSquare },
  { to: '/admin/newsletter',   label: 'Newsletter',   icon: Mail },
  { href: 'https://nexaacademy.sanity.studio/', label: 'Sanity Studio', icon: ExternalLink },
]

interface NavItem { to?: string; href?: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }

function MoreSection({
  items,
  isActive,
  onNavigate,
}: {
  items: NavItem[]
  isActive: (to: string, exact?: boolean) => boolean
  onNavigate: () => void
}) {
  const hasActiveChild = items.some((i) => i.to && isActive(i.to, i.exact))
  const [open, setOpen] = useState(hasActiveChild)

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
          hasActiveChild
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <MoreHorizontal className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">More</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 opacity-60 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-border space-y-0.5">
          {items.map(({ to, href, label, icon: Icon, exact }) =>
            href ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </a>
            ) : (
              <Link
                key={to}
                to={to!}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  isActive(to!, exact)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {isActive(to!, exact) && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                )}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  children: React.ReactNode
}

export function AdminLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  useEffect(() => {
    getNotifications(50)
      .then((items) => setUnreadCount(items.filter((n) => !n.read).length))
      .catch(() => {})
  }, [pathname])

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/nexa-academy-small-logo.png"
              alt="Nexa Academy"
              className="h-8 w-auto object-contain"
            />
            <span className="font-heading text-sm font-bold text-foreground">Nexa Admin</span>
          </div>
          <button
            className="lg:hidden p-1 rounded hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Primary items */}
          <div className="space-y-1">
            {PRIMARY_NAV.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive(to, exact)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {isActive(to, exact) && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                )}
              </Link>
            ))}
          </div>

          {/* More section */}
          <MoreSection
            items={MORE_NAV}
            isActive={isActive}
            onNavigate={() => setSidebarOpen(false)}
          />
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {(user?.display_name || user?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.display_name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/admin/notifications"
                onClick={() => setSidebarOpen(false)}
                className="relative p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
                )}
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
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/nexa-academy-logo.png"
            alt="Nexa Academy"
            className="h-7 w-auto object-contain"
          />
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
