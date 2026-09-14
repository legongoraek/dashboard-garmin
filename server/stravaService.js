const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_BASE = "https://api-v3.strava.com";

export function getStravaReadiness(env = process.env) {
  const required = ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REDIRECT_URI"];
  const missing = required.filter((key) => !env[key]);
  return { configured: missing.length === 0, missing };
}

export function buildStravaAuthorizationUrl({ clientId, redirectUri, state }) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read,activity:read_all");
  url.searchParams.set("state", state);
  return url.toString();
}

function config(env = process.env) {
  const readiness = getStravaReadiness(env);
  if (!readiness.configured) {
    throw new Error(`Strava no configurado: ${readiness.missing.join(", ")}`);
  }
  return {
    clientId: env.STRAVA_CLIENT_ID,
    clientSecret: env.STRAVA_CLIENT_SECRET,
    redirectUri: env.STRAVA_REDIRECT_URI,
  };
}

export function getStravaAuthorizationUrl(state, env = process.env) {
  const current = config(env);
  return buildStravaAuthorizationUrl({
    clientId: current.clientId,
    redirectUri: current.redirectUri,
    state,
  });
}

export async function exchangeStravaCode(code, env = process.env, fetchFn = fetch) {
  const current = config(env);
  const response = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: current.clientId,
      client_secret: current.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Strava token exchange failed: ${response.status}`);
  return response.json();
}

export async function refreshStravaToken(refreshToken, env = process.env, fetchFn = fetch) {
  const current = config(env);
  const response = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: current.clientId,
      client_secret: current.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Strava token refresh failed: ${response.status}`);
  return response.json();
}

export async function ensureStravaAccessToken(tokens, env = process.env, fetchFn = fetch) {
  if (!tokens?.access_token) throw new Error("Strava authorization required");
  const expiresAtMs = Number(tokens.expires_at ?? 0) * 1000;
  if (!expiresAtMs || Date.now() < expiresAtMs - 60_000) return tokens;
  return refreshStravaToken(tokens.refresh_token, env, fetchFn);
}

async function stravaGet(path, tokens, env = process.env, fetchFn = fetch) {
  const currentTokens = await ensureStravaAccessToken(tokens, env, fetchFn);
  const response = await fetchFn(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${currentTokens.access_token}` },
  });
  if (response.status === 401) throw new Error("Strava authorization required");
  if (response.status === 429) throw new Error("Strava rate limited");
  if (!response.ok) throw new Error(`Strava request failed: ${response.status}`);
  return { data: await response.json(), tokens: currentTokens };
}

export function getStravaActivities(tokens, { before, after, page = 1, perPage = 50 } = {}, env, fetchFn) {
  const params = new URLSearchParams();
  if (before) params.set("before", String(before));
  if (after) params.set("after", String(after));
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  return stravaGet(`/api/v3/athlete/activities?${params}`, tokens, env, fetchFn);
}

export function getStravaActivityStreams(tokens, activityId, env, fetchFn) {
  const keys = "time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp";
  return stravaGet(`/api/v3/activities/${encodeURIComponent(activityId)}/streams?keys=${encodeURIComponent(keys)}&key_by_type=true`, tokens, env, fetchFn);
}
