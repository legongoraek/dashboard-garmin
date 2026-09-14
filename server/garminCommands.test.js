import test from "node:test";
import assert from "node:assert/strict";
import { buildTrainingStatusArgs } from "./garminCommands.js";

test("training status uses the existing training CLI command", () => {
  assert.deepEqual(buildTrainingStatusArgs("2026-09-14"), ["training", "2026-09-14", "--pretty"]);
});
