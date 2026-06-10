import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldCheck, LogOut, User, Bell } from "lucide-react";
import notificationService from "@/services/notificationService";
import contentService from "@/services/contentService";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const defaultNavLinks = [
    { label: "Home", href: "/" },
    { label: "Programs", href: "/programs" },
    { label: "Apply Now", href: "/apply" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  const [navLinks, setNavLinks] = useState(defaultNavLinks);

  useEffect(() => {
    contentService.getNav().then(({ items }) => {
      if (items && items.length > 0) {
        setNavLinks(items.map((item) => ({ label: item.label, href: item.url })));
      }
    });
  }, []);

  const { currentUser, userRole, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const dashboardLink = currentUser
    ? `/student-dashboard/${currentUser.uid || currentUser.id || currentUser.user?.uid}`
    : "/student-login";

  // LogoLink component placed here to keep the header component simple
  function LogoLink() {
    const navigate = useNavigate();
    const clickCountRef = useRef(0);
    const timerRef = useRef(null);

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const handleLogoClick = (e) => {
      e.preventDefault();
      clickCountRef.current += 1;

      // debug
      // console.debug can be inspected in browser devtools
      console.debug("Logo clicked", clickCountRef.current);

      if (timerRef.current) clearTimeout(timerRef.current);

      if (clickCountRef.current >= 3) {
        clickCountRef.current = 0;
        console.debug("Triple click detected — navigating to /admin");
        navigate("/admin-login");
        return;
      }

      // single-click navigates to home after short delay unless more clicks follow
      timerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          console.debug("Single click — navigating to /");
          navigate("/");
        }
        clickCountRef.current = 0;
        timerRef.current = null;
      }, 500);
    };

    return (
      <div
        role="link"
        tabIndex={0}
        onClick={handleLogoClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleLogoClick(e);
        }}
        aria-label="Nexa Academy home"
        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded cursor-pointer"
      >
        <img
          src="/nexa-academy-small-logo.png"
          alt="Nexa Academy logo"
          className="w-10 h-10 object-contain"
          loading="lazy"
        />
        <span className="font-semibold">Nexa Academy</span>
      </div>
    );
  }

  return (
    <header
      className="w-full border-b border-border bg-background sticky top-0 z-50"
      role="banner"
    >
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* Logo supports single-click home and triple-click admin shortcut */}
          <LogoLink />
        </div>

        {/* Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-8 text-sm"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`transition-colors font-medium ${
                isActive(link.href)
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {!currentUser ? (
            <>
              <Link
                to="/student-login"
                className="inline-flex items-center justify-center rounded-md h-9 px-2.5 text-sm font-medium hover:text-primary transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/apply"
                className="inline-flex items-center justify-center rounded-md border border-primary text-primary hover:bg-primary hover:text-white h-9 px-2.5 text-sm font-medium transition-colors"
              >
                Apply Now
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  className="p-2 text-foreground/70 hover:text-primary relative"
                  onClick={async () => {
                    try {
                      // toggle and load notifications when opening
                      const open = !notificationsOpen;
                      setNotificationsOpen(open);
                      if (open) {
                        const res =
                          await notificationService.getNotifications();
                        const raw = res.data || [];
                        const normalized = (raw || []).map((n) => ({
                          id:
                            n.notification_id ||
                            n.id ||
                            n.notificationId ||
                            n.uid,
                          title: n.title,
                          message: n.message,
                          read: Boolean(n.read),
                          link: n.link || n.url || n.path || "",
                          timestamp: n.created_at || n.createdAt || n.timestamp,
                        }));
                        setNotifications(normalized);
                      }
                    } catch (e) {
                      console.error("Failed to load notifications", e);
                    }
                  }}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-border font-semibold">
                      Notifications
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No notifications
                        </div>
                      )}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            try {
                              if (!n.read) {
                                await notificationService.markAsRead(n.id);
                                setNotifications((prev) =>
                                  prev.map((x) =>
                                    x.id === n.id ? { ...x, read: true } : x,
                                  ),
                                );
                              }
                              if (n.link) window.open(n.link, "_blank");
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`p-3 border-b border-border cursor-pointer hover:bg-muted ${n.read ? "" : "bg-muted/5 border-l-4 border-primary"}`}
                        >
                          <div className="font-medium text-sm">
                            {n.title || "Notification"}
                          </div>
                          {n.message && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {n.message}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {n.timestamp || n.created_at}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-border flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          setNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true })),
                          );
                        }}
                        className="text-sm"
                      >
                        Mark all read
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {userRole === "admin" ? (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin Panel
                </Link>
              ) : (
                <Link
                  to={dashboardLink}
                  className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary"
                  aria-label="Student Dashboard"
                >
                  <User className="w-4 h-4" /> Dashboard
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-foreground/70 hover:text-primary"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-border bg-background px-4 pb-5 pt-3 space-y-1"
          role="menu"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
              role="menuitem"
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link
              to="/student-login"
              onClick={() => setMenuOpen(false)}
              className="inline-flex w-full items-center justify-start rounded-md h-9 px-2.5 text-sm font-medium hover:text-primary transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/apply"
              onClick={() => setMenuOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-md border border-primary text-primary hover:bg-primary hover:text-white h-9 px-2.5 text-sm font-medium transition-colors"
            >
              Apply
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
