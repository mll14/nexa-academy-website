import { req } from "./api";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  all_day?: boolean;
  type: "interview" | "intake" | "external" | "blackout" | "custom";
  meta?: {
    application_id?: string;
    intake_id?: string;
    blackout_id?: number;
    custom_event_id?: string;
    category?: string;
    color?: string;
    reason?: string;
    description?: string;
    meet_url?: string;
    attendees?: string[];
    gcal_link?: string;
  };
}

const _cache = new Map<string, { data: CalendarEvent[]; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const calendarService = {
  async fetchEvents(
    start: Date,
    end: Date,
  ): Promise<{ events: CalendarEvent[]; error: string | null }> {
    const key = `${start.toISOString()}|${end.toISOString()}`;
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) {
      return { events: hit.data, error: null };
    }
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      }).toString();
      const res = await req<{ events: CalendarEvent[] }>(
        `/calendar/events/?${params}`,
      );
      const events = res.events ?? [];
      _cache.set(key, { data: events, fetchedAt: Date.now() });
      return { events, error: null };
    } catch (err) {
      return {
        events: [],
        error:
          err instanceof Error ? err.message : "Failed to load calendar events",
      };
    }
  },

  clearCache() {
    _cache.clear();
  },
};
