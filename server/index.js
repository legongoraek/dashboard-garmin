import express from "express";
import cors from "cors";

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
  checkSession,
} from "./garminService.js";

const app = express();

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

let loginBlockedUntil = null;

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

    const result = await loginGarmin(email, password);
    return res.json(result);
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

    const result = await loginGarminWithMfa(email, password, mfaCode);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/session", async (req, res) => {
  try {
    const result = await checkSession();
    return res.json(result);
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
    const result = await getDailySummary(date);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/sleep", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getSleepSummary(date);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/weekly", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getWeeklySummary(date);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/activities", async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    const result = await getActivities({
      from,
      to,
      limit,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/hrv", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getHrvSummary(date);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/readiness", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getTrainingReadiness(date);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/training-status", async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getTrainingStatus(date);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/health-garmin", async (req, res) => {
  try {
    const response = await fetch("https://connect.garmin.com");
    res.json({
      ok: true,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: String(error),
    });
  }
});

app.get("/api/debug-network", async (req, res) => {
  const tests = [
    "https://connect.garmin.com",
    "https://sso.garmin.com",
  ];

  const results = [];

  for (const url of tests) {
    try {
      const response = await fetch(url);
      results.push({
        url,
        ok: true,
        status: response.status,
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        error: String(error),
      });
    }
  }

  res.json({
    ok: true,
    results,
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Garmin API running on http://localhost:${PORT}`);
});