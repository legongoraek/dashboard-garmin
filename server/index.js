import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pathToFileURL } from "node:url";
import providerRoutes from "./providerRoutes.js";

import {
  loginGarmin,
  loginGarminWithMfa,
  getDailySummary,
  getSleepSummary,
  getWeeklySummary,
  getActivities,
  getHrvSummary,
  getTrainingReadiness,
  getTrainingStatus,
  getActivityDetail,
  checkSession,
} from "./garminService.js";

export const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://dashboard-garmin-azure.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api", providerRoutes);

const isProd = process.env.NODE_ENV !== "development";
const TOKENS_COOKIE = "garmin_tokens";
const TOKENS_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

function setTokensCookie(res, tokens) {
  if (!tokens) return;

  const value = JSON.stringify(tokens);
  if (value.length > 3500) {
    console.warn(
      `[cookie] garmin_tokens is ${value.length} bytes raw — near the ~4KB browser per-cookie limit once URL-encoded.`
    );
  }

  res.cookie(TOKENS_COOKIE, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: TOKENS_COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

function getIncomingTokens(req) {
  const raw = req.cookies?.[TOKENS_COOKIE];
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let loginBlockedUntil = null;

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  try {
    if (loginBlockedUntil && Date.now() < loginBlockedUntil) {
      return res.status(429).json({
        ok: false,
        error: "Login temporalmente bloqueado por límite de Garmin. Intenta más tarde.",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Falta email o password",
      });
    }

    const { tokens, ...body } = await loginGarmin(email, password);
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    if (error.message.includes("Garmin bloqueó temporalmente")) {
      loginBlockedUntil = Date.now() + 15 * 60 * 1000;
    }
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/login/mfa", async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;

    if (!email || !password || !mfaCode) {
      return res.status(400).json({
        ok: false,
        error: "Falta email, password o código MFA",
      });
    }

    const { tokens, ...body } = await loginGarminWithMfa(email, password, mfaCode);
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session", async (req, res) => {
  try {
    const { tokens, ...body } = await checkSession(getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch {
    return res.status(401).json({
      ok: false,
      authenticated: false,
    });
  }
});

app.get("/api/daily", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getDailySummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/sleep", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getSleepSummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/weekly", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getWeeklySummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/activities", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const { tokens, ...body } = await getActivities({ from, to, limit }, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/hrv", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getHrvSummary(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/readiness", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getTrainingReadiness(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/training-status", async (req, res) => {
  try {
    const { date } = req.query;
    const { tokens, ...body } = await getTrainingStatus(date, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/activity-detail", async (req, res) => {
  try {
    const { activityId } = req.query;
    if (!activityId) return res.status(400).json({ ok: false, error: "Falta activityId" });
    const { tokens, ...body } = await getActivityDetail(activityId, getIncomingTokens(req));
    setTokensCookie(res, tokens);
    return res.json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/health-garmin", async (req, res) => {
  try {
    const response = await fetch("https://connect.garmin.com");
    res.json({ ok: true, status: response.status, statusText: response.statusText });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

app.get("/api/debug-network", async (req, res) => {
  const tests = ["https://connect.garmin.com", "https://sso.garmin.com"];
  const results = [];
  for (const url of tests) {
    try {
      const response = await fetch(url);
      results.push({ url, ok: true, status: response.status });
    } catch (error) {
      results.push({ url, ok: false, error: String(error) });
    }
  }
  res.json({ ok: true, results });
});

export function startServer(port = process.env.PORT || 4000, { logger = console } = {}) {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    logger.log(`Garmin API running on http://localhost:${actualPort}`);
  });
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  startServer();
}
