import test from "node:test";
import assert from "node:assert/strict";
import { buildYearOverYearSummary } from "./yearOverYear.js";

const activities = [
  { activityUid: "a", startedAtLocal: "2026-01-10T08:00:00", distanceM: 10000, durationS: 3600, elevationGainM: 100 },
  { activityUid: "b", startedAtLocal: "2026-02-10T08:00:00", distanceM: 5000, durationS: 1800, elevationGainM: null },
  { activityUid: "c", startedAtLocal: "2025-01-10T08:00:00", distanceM: 8000, durationS: 3200, elevationGainM: 80 },
  { activityUid: "d", startedAtLocal: "2025-02-10T08:00:00", distanceM: null, durationS: 1600, elevationGainM: null },
];

test("compares current year-to-date with the equivalent prior-year window", () => {
  const result = buildYearOverYearSummary(activities, "2026-02-28");

  assert.equal(result.current.from, "2026-01-01");
  assert.equal(result.current.to, "2026-02-28");
  assert.equal(result.previous.from, "2025-01-01");
  assert.equal(result.previous.to, "2025-02-28");
  assert.equal(result.current.activityCount, 2);
  assert.equal(result.previous.activityCount, 2);
  assert.equal(result.current.distanceM, 15000);
  assert.equal(result.previous.distanceM, 8000);
});

test("keeps all-missing metrics null rather than zero", () => {
  const result = buildYearOverYearSummary([
    { activityUid: "a", startedAtLocal: "2026-01-10T08:00:00", elevationGainM: null },
    { activityUid: "b", startedAtLocal: "2025-01-10T08:00:00", elevationGainM: null },
  ], "2026-02-28");

  assert.equal(result.current.elevationGainM, null);
  assert.equal(result.previous.elevationGainM, null);
  assert.equal(result.change.elevationGainPct, null);
});

test("calculates percentage deltas only when prior value is non-zero", () => {
  const result = buildYearOverYearSummary(activities, "2026-02-28");
  assert.equal(result.change.activityCountPct, 0);
  assert.equal(result.change.distancePct, 87.5);
});
