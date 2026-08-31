const SHORT_TTL_MS = 5 * 60 * 1000;
const LONG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ttlForDate(date) {
  if (!date) return SHORT_TTL_MS;
  return date < todayStr() ? LONG_TTL_MS : SHORT_TTL_MS;
}

export { SHORT_TTL_MS };

export async function cachedRequest(key, ttlMs, fetchFn) {
  const cacheKey = `garmin_cache:${key}`;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { expiresAt, value } = JSON.parse(raw);
      if (Date.now() < expiresAt) return value;
    }
  } catch {
    // corrupt/unreadable entry — fall through to a real fetch
  }

  const value = await fetchFn();

  if (value?.data != null) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + ttlMs, value }));
    } catch {
      // localStorage full or unavailable (private browsing) — non-fatal, just skip caching
    }
  }

  return value;
}
