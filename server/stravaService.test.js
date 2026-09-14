import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStravaAuthorizationUrl,
  getStravaReadiness,
  revokeStravaToken,
} from "./stravaService.js";

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

test("revokes Strava access token using Basic client authentication", async () => {
  let request;
  const result = await revokeStravaToken(
    "access-token",
    {
      STRAVA_CLIENT_ID: "123",
      STRAVA_CLIENT_SECRET: "secret",
      STRAVA_REDIRECT_URI: "https://example.com/callback",
    },
    async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, async json() { return {}; } };
    }
  );

  assert.equal(request.url, "https://www.strava.com/oauth/revoke");
  assert.match(request.options.headers.Authorization, /^Basic /);
  assert.equal(new URLSearchParams(request.options.body).get("token"), "access-token");
  assert.equal(result.revoked, true);
});
