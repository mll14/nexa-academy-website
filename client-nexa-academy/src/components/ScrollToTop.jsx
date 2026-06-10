import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop({ children }) {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Keep position when deep-linking from pricing cards to calculator plan tabs.
    const query = new URLSearchParams(search);
    const isPricingCalculatorJump =
      pathname === "/programs" &&
      hash === "#finance-calculator" &&
      query.has("plan");

    if (isPricingCalculatorJump) return;

    try {
      // smooth scroll to top when route changes
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      // fallback
      window.scrollTo(0, 0);
    }
  }, [pathname, search, hash]);

  return children || null;
}
