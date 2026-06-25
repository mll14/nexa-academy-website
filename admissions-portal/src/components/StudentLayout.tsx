import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface Props {
  children: React.ReactNode
  unreadCount?: number
  contentClassName?: string
}

const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/application', label: 'Application', icon: FileText },
  { to: '/student/payments', label: 'Payments', icon: CreditCard },
]

// ── Header ────────────────────────────────────────────────────────────────────

function StudentHeader({ unreadCount }: { unreadCount?: number }) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const isActive = (to: string) => pathname.startsWith(to)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName = user?.display_name || 'Student'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link to="/student/dashboard" className="flex items-center gap-2.5 shrink-0">
              <img
                src="/nexa-academy-small-logo.png"
                alt="Nexa Academy"
                className="h-8 w-auto object-contain"
              />
              <span className="font-heading font-bold text-base text-foreground hidden sm:block">
                Nexa Academy
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {STUDENT_NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground/70 hover:text-primary hover:bg-muted',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right: bell + avatar */}
            <div className="flex items-center gap-1.5">
              <Link
                to="/student/notifications"
                className={cn(
                  'relative p-2 rounded-lg transition-colors',
                  isActive('/student/notifications')
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/70 hover:text-primary hover:bg-muted',
                )}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {!!unreadCount && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                )}
              </Link>

              {/* Avatar dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.photo_url ? (
                      <img
                        src={user.photo_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-primary">{initial}</span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-muted-foreground hidden sm:block transition-transform duration-150',
                      profileOpen && 'rotate-180',
                    )}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-background shadow-lg py-1.5 z-50">
                    <div className="px-3 py-2.5 border-b border-border mb-1">
                      <p className="text-sm font-semibold truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/student/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-primary transition-colors"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); logout('/login') }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-destructive transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-72 bg-background shadow-xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <img
                  src="/nexa-academy-small-logo.png"
                  alt="Nexa Academy"
                  className="h-7 w-auto object-contain"
                />
                <span className="font-heading font-bold text-sm">Nexa Academy</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {STUDENT_NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
              <Link
                to="/student/notifications"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive('/student/notifications')
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                )}
              >
                <Bell className="w-4 h-4 shrink-0" />
                Notifications
                {!!unreadCount && unreadCount > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Drawer footer */}
            <div className="p-4 border-t border-border space-y-1">
              <Link
                to="/student/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4 shrink-0" />
                My Profile
              </Link>
              <button
                onClick={() => { setMobileOpen(false); logout('/login') }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function StudentFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="w-full mt-auto"
      style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)' }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/nexa-academy-small-logo.png"
                alt="Nexa Academy"
                className="w-10 h-10 object-contain rounded-md bg-white p-0.5"
              />
              <span className="text-lg font-semibold text-white">Nexa Academy</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Empowering the next generation of African tech talent through
              industry-relevant education and certification.
            </p>
          </div>

          {/* Student portal links */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Student Portal
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/student/dashboard', label: 'Dashboard' },
                { to: '/student/application', label: 'My Application' },
                { to: '/student/payments', label: 'Payments' },
                { to: '/student/notifications', label: 'Notifications' },
                { to: '/student/profile', label: 'My Profile' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-white/70 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm text-white/70 break-all">admissions@nexaacademy.co.ke</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm text-white/70">+254 713 067 311</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm text-white/70">
                  10th Floor, JKUAT Towers, CBD Nairobi
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-sm text-white">© {year} Nexa Academy</p>
          <span className="text-white/20 hidden sm:inline">|</span>
          <p className="text-xs text-white/60">All rights reserved</p>
          <span className="text-white/20 hidden sm:inline">|</span>
          <div className="flex items-center gap-4 text-xs">
            <a
              href="https://nexaacademy.co.ke/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-white/20">|</span>
            <a
              href="https://nexaacademy.co.ke/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-primary transition-colors"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function StudentLayout({ children, unreadCount, contentClassName = 'max-w-5xl' }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <StudentHeader unreadCount={unreadCount} />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-8">
        <div className={`${contentClassName} mx-auto w-full`}>
          {children}
        </div>
      </main>
      <StudentFooter />
    </div>
  )
}
