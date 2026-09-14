import test from "node:test";
import assert from "node:assert/strict";
import { buildStravaAuthorizationUrl, getStravaReadiness } from "./stravaService.js";

test("reports missing Strava configuration without secrets", () => {
  const readiness = getStravaReadiness({});
  assert.equal(readiness.configured, false);
  assert.deepEqual(readiness.missing, ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REDIRECT_URI"]);
});

test("builds authorization URL with state and activity scopes", () => {
  const url = new URL(buildStravaAuthorizationUrl({
    clientId: "123",
    redirectUri: "https://example.com/api/strava/oauth/callback",
    state: "abc",
  }));
  assert.equal(url.origin, "https://www.strava.com");
  assert.equal(url.searchParams.get("client_id"), "123");
  assert.equal(url.searchParams.get("state"), "abc");
  assert.match(url.searchParams.get("scope"), /activity:read/);
});
