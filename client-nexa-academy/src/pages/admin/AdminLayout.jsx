import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CreditCard,
  UserPlus,
  Mail,
  Flame,
  Calendar,
  PenSquare,
  BookOpen,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import notificationService from "@/services/notificationService";

const navGroups = [
  {
    label: "Core",
    items: [
      { label: "Dashboard",     href: "/admin",               icon: LayoutDashboard },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Applications",  href: "/admin/applications",  icon: Users, highlight: true },
      { label: "Interviews",    href: "/admin/interviews",     icon: Calendar },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Programs", href: "/admin/programs", icon: BookOpen },
      { label: "Studio", href: "/admin/studio", icon: PenSquare },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
      { label: "Transactions", href: "/admin/transactions", icon: CreditCard },
      { label: "Enroll Student", href: "/admin/enroll", icon: UserPlus },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mail },
      { label: "Express Interest", href: "/admin/express-interest", icon: Flame },
    ],
  },
];

function NavItem({ label, href, icon: Icon, active, highlight, badge, onClose }) {
  return (
    <Link
      to={href}
      onClick={onClose}
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative
        ${active
          ? "bg-white/15 text-white"
          : highlight
            ? "text-white/70 hover:text-white hover:bg-white/10"
            : "text-white/60 hover:text-white/90 hover:bg-white/8"
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
      )}
      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-white/50 group-hover:text-white/80"}`} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-destructive rounded-full">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {highlight && !active && !badge && (
        <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
      )}
    </Link>
  );
}

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (mounted && res.success) setUnreadCount(res.count || 0);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleLogout = async () => { await logout("/"); };

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link to="/admin" onClick={onClose} className="flex items-center gap-3">
          <img
            src="/nexa-academy-small-logo.png"
            alt="Nexa Academy"
            className="h-8 w-8 object-contain"
          />
          <div>
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nexa Academy
            </p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest font-semibold text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={location.pathname === item.href}
                  badge={item.href === "/admin/notifications" ? unreadCount : 0}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar — fixed */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-30"
        style={{ background: "oklch(0.22 0.08 260)" }}
      >
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`
          md:hidden fixed left-0 top-0 bottom-0 w-72 flex flex-col z-50
          transform transition-transform duration-250 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ background: "oklch(0.22 0.08 260)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/nexa-academy-small-logo.png" alt="Nexa" className="h-7 w-7 object-contain" />
            <span className="text-white font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nexa Admin
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* Main content — offset for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-60">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <img src="/nexa-academy-small-logo.png" alt="Nexa" className="h-6 w-6 object-contain" />
            <span className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nexa Admin
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
