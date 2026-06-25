import { useState, useMemo } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
  PanelLeftClose,
  UserCog,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getNotifications } from '../lib/api'
import { cn } from '../lib/utils'

const PRIMARY_NAV = [
  { to: '/admin',              label: 'Dashboard',         icon: LayoutDashboard, exact: true },
  { to: '/admin/applications', label: 'Applications',      icon: Users,           permission: 'applications.view' },
  { to: '/admin/interviews',   label: 'Interviews',        icon: Calendar,        permission: 'interviews.view' },
  { to: '/admin/appointments', label: 'Appointments',      icon: Calendar,        permission: 'appointments.view' },
  { to: '/admin/enrolled',     label: 'Enrolled Students', icon: GraduationCap,   permission: 'students.view' },
]

const MORE_NAV = [
  { to: '/admin/programs',   label: 'Programs & Intakes', icon: BookOpen,      permission: 'programs.view' },
  { to: '/admin/payments',   label: 'Payments',           icon: CreditCard,    permission: 'transactions.view' },
  { to: '/admin/leads',      label: 'Leads',              icon: Flame,         permission: 'leads.view' },
  { to: '/admin/messages',   label: 'Messages',           icon: MessageSquare, permission: 'messages.view' },
  { to: '/admin/newsletter', label: 'Newsletter',         icon: Mail,          permission: 'newsletter.view' },
  { to: '/admin/users',      label: 'Staff Access',       icon: UserCog,       anyPermissions: ['users.view', 'roles.view', 'roles.manage'] },
  { href: 'https://nexaacademy.sanity.studio/', label: 'Sanity Studio', icon: ExternalLink },
]

interface NavItem {
  to?: string
  href?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  permission?: string
  anyPermissions?: string[]
}

function MoreSection({
  items,
  isActive,
  onNavigate,
  collapsed,
}: {
  items: NavItem[]
  isActive: (to: string, exact?: boolean) => boolean
  onNavigate: () => void
  collapsed: boolean
}) {
  const hasActiveChild = items.some((i) => i.to && isActive(i.to, i.exact))
  // Initial value only — intentionally not synced after mount so the accordion
  // state survives navigations within the "More" group. If AdminLayout ever
  // becomes a persistent shell (not remounted on route change), add a useEffect
  // that calls setOpen(hasActiveChild) when hasActiveChild flips.
  const [open, setOpen] = useState(hasActiveChild)

  if (collapsed) return null

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
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
  const { user, logout, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getNotifications(50),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const unreadCount = useMemo(
    () => notificationsData?.filter((n) => !n.read).length ?? 0,
    [notificationsData],
  )

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  const { visiblePrimary, visibleMore } = useMemo(() => {
    const canSee = (item: NavItem) => {
      if (item.anyPermissions?.length) return item.anyPermissions.some((p) => hasPermission(p))
      return !item.permission || hasPermission(item.permission)
    }
    return {
      visiblePrimary: PRIMARY_NAV.filter(canSee),
      visibleMore: MORE_NAV.filter(canSee),
    }
  }, [hasPermission])

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'group/sidebar fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-200',
          'w-64 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        {/* Logo */}
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
            Nexa Admin
          </span>
          <div className={cn('flex items-center gap-1 shrink-0', sidebarCollapsed && 'lg:hidden')}>
            <button
              className="lg:hidden p-1 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(false) }}
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

        {/* Nav */}
        <nav className={cn('flex-1 overflow-y-auto', sidebarCollapsed ? 'lg:p-2 p-4' : 'p-4')}>
          {/* Primary items */}
          <div className="space-y-1">
            {visiblePrimary.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  sidebarCollapsed && 'lg:justify-center lg:px-0 lg:py-2.5',
                  isActive(to, exact)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={cn(sidebarCollapsed && 'lg:hidden')}>{label}</span>
                {isActive(to, exact) && !sidebarCollapsed && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                )}
              </Link>
            ))}
          </div>

          {/* More section */}
          <MoreSection
            items={visibleMore}
            isActive={isActive}
            onNavigate={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
          />
        </nav>

        {/* User */}
        <div className={cn('border-t border-border', sidebarCollapsed ? 'lg:p-2 p-4' : 'p-4 space-y-0.5')}>
          {/* Notifications */}
          <Link
            to="/admin/notifications"
            onClick={() => setSidebarOpen(false)}
            title={sidebarCollapsed ? 'Notifications' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              sidebarCollapsed && 'lg:justify-center lg:px-0',
              isActive('/admin/notifications')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <div className="relative shrink-0">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
            <span className={cn('flex-1', sidebarCollapsed && 'lg:hidden')}>Notifications</span>
            {unreadCount > 0 && (
              <span className={cn('text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight', sidebarCollapsed && 'lg:hidden')}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Account + Logout */}
          <div className={cn('flex items-center gap-2', sidebarCollapsed && 'lg:flex-col lg:gap-2')}>
            <Link
              to="/admin/account"
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? 'My Account' : undefined}
              className={cn(
                'flex items-center gap-3 flex-1 min-w-0 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors',
                sidebarCollapsed && 'lg:justify-center lg:px-0',
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(user?.display_name || user?.email || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={cn('flex-1 min-w-0', sidebarCollapsed && 'lg:hidden')}>
                <p className="text-xs font-medium truncate">{user?.display_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.staffRole ? user.staffRole.name : 'Super Admin'}
                </p>
              </div>
            </Link>
            <button
              onClick={() => logout('/login')}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-200', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Top bar (mobile) */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="h-7 w-auto object-contain"
          />
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
