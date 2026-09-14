import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const componentUrls = [
  new URL("../../components/analytics/TrendLineChart.jsx", import.meta.url),
  new URL("../../components/analytics/WeeklyVolumeChart.jsx", import.meta.url),
  new URL("../../components/analytics/TrainingTrends.jsx", import.meta.url),
  new URL("../../components/analytics/RecoveryTrends.jsx", import.meta.url),
  new URL("../../components/analytics/AnalyticsTrendsSection.jsx", import.meta.url),
];

const forbidden = [
  "totalDistanceMeters",
  "totalKilocalories",
  "bodyBatteryMostRecentValue",
  "dailySleepDTO",
  "activityType.typeKey",
];

test("analytics components never depend on Garmin payload field names", async () => {
  for (const url of componentUrls) {
    const source = await readFile(url, "utf8");
    for (const field of forbidden) {
      assert.equal(
        source.includes(field),
        false,
        `${url.pathname} must not reference provider field ${field}`
      );
    }
  }
});
