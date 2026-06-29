import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
});

export async function loginGarmin(email, password) {
  const response = await api.post("/login", {
    email,
    password,
  });

  return response.data;
}

export async function loginGarminMfa(email, password, mfaCode) {
  const response = await api.post("/login/mfa", {
    email,
    password,
    mfaCode,
  });

  return response.data;
}

export async function checkGarminSession() {
  const response = await api.get("/session");
  return response.data;
}

export async function getDaily(date) {
  const response = await api.get("/daily", {
    params: { date },
  });

  return response.data;
}

export async function getSleep(date) {
  const response = await api.get("/sleep", {
    params: { date },
  });

  return response.data;
}

export async function getWeekly(date) {
  const response = await api.get("/weekly", {
    params: { date },
  });

  return response.data;
}

export async function getActivities({ from, to, limit = 10 }) {
  const response = await api.get("/activities", {
    params: {
      from,
      to,
      limit,
    },
  });

  return response.data;
}