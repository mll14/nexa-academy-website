import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import contentService from '@/services/contentService';

const STORAGE_KEY = 'dismissed_banners';

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function PopupBanner() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    contentService.getActiveBanners().then(({ banners }) => {
      if (!banners || !banners.length) return;
      const dismissed = getDismissed();
      const match = banners.find((b) => {
        if (dismissed.includes(String(b.id))) return false;
        if (b.target_page === 'all') return true;
        if (b.target_page === 'home') return path === '/';
        if (b.target_page === 'programs') return path.startsWith('/programs');
        if (b.target_page === 'blog') return path.startsWith('/blog');
        return false;
      });
      setBanner(match || null);
    });
  }, []);

  if (!banner) return null;

  const dismiss = () => {
    if (banner.dismissible) {
      const dismissed = getDismissed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, String(banner.id)]));
    }
    setBanner(null);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 flex justify-center pointer-events-none">
      <div className="max-w-2xl w-full bg-primary text-primary-foreground rounded-2xl shadow-xl px-5 py-4 flex items-start gap-4 pointer-events-auto">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">{banner.title}</p>
          {banner.body && (
            <p className="text-xs mt-1 opacity-90 leading-relaxed">{banner.body}</p>
          )}
          {banner.cta_text && banner.cta_url && (
            <a
              href={banner.cta_url}
              className="inline-block mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {banner.cta_text} →
            </a>
          )}
        </div>
        {banner.dismissible && (
          <button
            onClick={dismiss}
            aria-label="Dismiss banner"
            className="shrink-0 mt-0.5 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
