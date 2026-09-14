import axios from "axios";

const api = axios.create({
  baseURL: import.meta?.env?.VITE_GARMIN_API_URL || "/api",
  withCredentials: true,
});

export async function getProviderReadiness() {
  const response = await api.get("/providers");
  return response.data;
}

export async function getPostgresHealth() {
  const response = await api.get("/providers/postgres/health");
  return response.data;
}

export async function startStravaAuthorization() {
  const response = await api.get("/strava/oauth/start");
  return response.data;
}

export async function disconnectStrava() {
  const response = await api.post("/strava/disconnect");
  return response.data;
}

export async function getStravaActivities(params = {}) {
  const response = await api.get("/strava/activities", { params });
  return response.data;
}

export async function getStravaActivityStreams(activityId) {
  const response = await api.get(`/strava/activities/${encodeURIComponent(activityId)}/streams`);
  return response.data;
}
