import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  exchangeStravaCode,
  getStravaActivities,
  getStravaActivityStreams,
  getStravaAuthorizationUrl,
  revokeStravaToken,
} from "./stravaService.js";
import { buildProviderReadiness } from "./providerReadiness.js";

const router = Router();
const isProd = process.env.NODE_ENV !== "development";
const STRAVA_TOKENS_COOKIE = "strava_tokens";
const STRAVA_STATE_COOKIE = "strava_oauth_state";
const COOKIE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

function parseCookieJson(req, name) {
  const raw = req.cookies?.[name];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStravaTokens(res, tokens) {
  res.cookie(STRAVA_TOKENS_COOKIE, JSON.stringify(tokens), {
    ...cookieOptions,
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

router.get("/providers", (req, res) => {
  const stravaAuthorized = Boolean(
    parseCookieJson(req, STRAVA_TOKENS_COOKIE)?.access_token
  );
  res.json(buildProviderReadiness(process.env, { stravaAuthorized }));
});

router.get("/strava/oauth/start", (req, res) => {
  try {
    const state = randomUUID();
    res.cookie(STRAVA_STATE_COOKIE, state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
    res.json({ ok: true, authorizationUrl: getStravaAuthorizationUrl(state) });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

router.get("/strava/oauth/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const expectedState = req.cookies?.[STRAVA_STATE_COOKIE];
    if (!code || !state || !expectedState || state !== expectedState) {
      return res.status(400).json({ ok: false, error: "Invalid Strava OAuth state or code" });
    }

    const tokens = await exchangeStravaCode(code);
    setStravaTokens(res, tokens);
    res.clearCookie(STRAVA_STATE_COOKIE, cookieOptions);
    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontend}/sources?strava=connected`);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/strava/disconnect", async (req, res) => {
  const tokens = parseCookieJson(req, STRAVA_TOKENS_COOKIE);
  let revoked = false;
  let warning = null;

  try {
    if (tokens?.access_token) {
      const result = await revokeStravaToken(tokens.access_token);
      revoked = result.revoked;
    }
  } catch (error) {
    warning = error.message;
  } finally {
    res.clearCookie(STRAVA_TOKENS_COOKIE, cookieOptions);
  }

  res.json({ ok: true, revoked, warning });
});

router.get("/strava/activities", async (req, res) => {
  try {
    const tokens = parseCookieJson(req, STRAVA_TOKENS_COOKIE);
    const result = await getStravaActivities(tokens, req.query);
    setStravaTokens(res, result.tokens);
    res.json({ ok: true, data: result.data });
  } catch (error) {
    const status = error.message.includes("authorization") ? 401 : error.message.includes("rate limited") ? 429 : 500;
    res.status(status).json({ ok: false, error: error.message });
  }
});

router.get("/strava/activities/:id/streams", async (req, res) => {
  try {
    const tokens = parseCookieJson(req, STRAVA_TOKENS_COOKIE);
    const result = await getStravaActivityStreams(tokens, req.params.id);
    setStravaTokens(res, result.tokens);
    res.json({ ok: true, data: result.data });
  } catch (error) {
    const status = error.message.includes("authorization") ? 401 : error.message.includes("rate limited") ? 429 : 500;
    res.status(status).json({ ok: false, error: error.message });
  }
});

export default router;
