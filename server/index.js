import express from "express";
import cors from "cors";

import {
  loginGarmin,
  loginGarminWithMfa,
  getDailySummary,
  getSleepSummary,
  getWeeklySummary,
  getActivities,
  checkSession,
} from "./garminService.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.post("/api/login", async (req, res) => {
  try {
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

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Garmin API running on http://localhost:${PORT}`);
});