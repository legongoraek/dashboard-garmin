import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_GARMIN_API_URL || "http://localhost:4000/api",
});

const WAKE_UP_TTL_MS = 5 * 60 * 1000;
let wakeUpPromise = null;
let backendAwakeUntil = 0;

export function wakeUpBackend() {
  if (Date.now() < backendAwakeUntil) {
    return Promise.resolve();
  }

  if (!wakeUpPromise) {
    wakeUpPromise = api
      .get("/health", { timeout: 60_000 })
      .then(() => {
        backendAwakeUntil = Date.now() + WAKE_UP_TTL_MS;
      })
      .finally(() => {
        wakeUpPromise = null;
      });
  }

  return wakeUpPromise;
}

function getBackendError(error, fallbackMessage) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

async function requestApi(requestFn, fallbackMessage) {
  try {
    await wakeUpBackend();
    const response = await requestFn();
    const data = response.data;

    if (data?.ok === false || data?.error) {
      throw new Error(data?.error || fallbackMessage);
    }

    return data;
  } catch (error) {
    throw new Error(getBackendError(error, fallbackMessage), { cause: error });
  }
}

export function loginGarmin(email, password) {
  return requestApi(
    () => api.post("/login", { email, password }),
    "Error al iniciar sesión en Garmin"
  );
}

export function loginGarminMfa(email, password, mfaCode) {
  return requestApi(
    () => api.post("/login/mfa", { email, password, mfaCode }),
    "Error al iniciar sesión en Garmin con MFA"
  );
}

export function checkGarminSession() {
  return requestApi(
    () => api.get("/session"),
    "Error al verificar la sesión de Garmin"
  );
}

export function getDaily(date) {
  return requestApi(
    () => api.get("/daily", { params: { date } }),
    "Error al obtener los datos diarios"
  );
}

export function getSleep(date) {
  return requestApi(
    () => api.get("/sleep", { params: { date } }),
    "Error al obtener los datos de sueño"
  );
}

export function getWeekly(date) {
  return requestApi(
    () => api.get("/weekly", { params: { date } }),
    "Error al obtener los datos semanales"
  );
}

export function getActivities({ from, to, limit = 10 }) {
  return requestApi(
    () =>
      api.get("/activities", {
        params: { from, to, limit },
      }),
    "Error al obtener las actividades"
  );
}

export function getHrv(date) {
  return requestApi(
    () => api.get("/hrv", { params: { date } }),
    "Error al obtener los datos de HRV"
  );
}

export function getReadiness(date) {
  return requestApi(
    () => api.get("/readiness", { params: { date } }),
    "Error al obtener los datos de readiness"
  );
}

export async function getTrainingStatus(date) {
  return requestApi(
    () => api.get("/training-status", { params: { date } }),
    "Error al obtener los datos de estado de entrenamiento"
  );
}
