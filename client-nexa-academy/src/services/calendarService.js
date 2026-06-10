import apiService from './apiService';

const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const calendarService = {
  async fetchEvents(start, end) {
    const key = `${start.toISOString()}|${end.toISOString()}`;
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) {
      return { events: hit.data, error: null };
    }
    try {
      const res = await apiService.get('/calendar/events/', {
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const events = res.events || [];
      _cache.set(key, { data: events, fetchedAt: Date.now() });
      return { events, error: null };
    } catch (err) {
      return { events: [], error: err?.message || 'Failed to load calendar events' };
    }
  },

  clearCache() {
    _cache.clear();
  },
};

export default calendarService;
