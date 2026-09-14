export const SESSION_STORAGE_KEY = "garmin_session";

export function hasStoredSession(storage) {
  return storage.getItem(SESSION_STORAGE_KEY) === "true";
}

export function storeSession(storage) {
  storage.setItem(SESSION_STORAGE_KEY, "true");
}

export function clearSession(storage) {
  storage.removeItem(SESSION_STORAGE_KEY);
}

export function resolveLoginRoute(hasSession) {
  return hasSession ? "/dashboard" : "/login";
}

export function resolveProtectedRoute(hasSession) {
  return hasSession ? "/dashboard" : "/login";
}

export function normalizePublicPath(pathname) {
  return ["/", "/login", "/dashboard"].includes(pathname) ? pathname : "/";
}
