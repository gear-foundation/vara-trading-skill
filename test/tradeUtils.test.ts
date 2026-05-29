import assert from "node:assert/strict";
import test from "node:test";

import { isUsdLikeQuote, parseSymbol, resolveDryRun } from "../src/commands/tradeUtils.ts";

test("parseSymbol normalizes base and quote", () => {
  assert.deepEqual(parseSymbol("vara/usdt"), {
    base: "VARA",
    quote: "USDT",
  });
});

test("parseSymbol rejects invalid symbols", () => {
  assert.throws(() => parseSymbol("VARA"), /Invalid market symbol/);
  assert.throws(() => parseSymbol("VARA/"), /Invalid market symbol/);
});

test("resolveDryRun validates explicit execution modes", () => {
  assert.equal(resolveDryRun("dry-run"), true);
  assert.equal(resolveDryRun("live"), false);
  assert.throws(() => resolveDryRun("paper" as never), /Execution mode must be/);
});

test("resolveDryRun uses local dry-run env default", () => {
  const previous = process.env.VARA_AGENT_DRY_RUN;

  try {
    process.env.VARA_AGENT_DRY_RUN = "false";
    assert.equal(resolveDryRun(), false);

    delete process.env.VARA_AGENT_DRY_RUN;
    assert.equal(resolveDryRun(), true);
  } finally {
    if (previous === undefined) {
      delete process.env.VARA_AGENT_DRY_RUN;
    } else {
      process.env.VARA_AGENT_DRY_RUN = previous;
    }
  }
});

test("isUsdLikeQuote accepts USD stable quotes case-insensitively", () => {
  assert.equal(isUsdLikeQuote("USD"), true);
  assert.equal(isUsdLikeQuote("usdt"), true);
  assert.equal(isUsdLikeQuote("UsDc"), true);
  assert.equal(isUsdLikeQuote("EUR"), false);
});
