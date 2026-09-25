import assert from "node:assert/strict";
import test from "node:test";
import { flagRatio } from "../lib/flag/ratios.ts";

test("flags use their own proportions", () => {
  assert.equal(flagRatio("US"), 19 / 10);
  assert.equal(flagRatio("GB"), 2);
  assert.equal(flagRatio("FR"), 3 / 2);
  assert.equal(flagRatio("CH"), 1);
  assert.equal(flagRatio("QA"), 28 / 11);
  assert.ok(flagRatio("NP") < 1);
  assert.equal(flagRatio("ZZ"), 3 / 2);
});
