import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cliPath = path.join(process.cwd(), "dist", "cli.js");

test("routes command returns JSON without API credentials", () => {
  const output = runCli([
    "routes",
    "--side",
    "buy",
    "--quote",
    "USDT",
    "--amount",
    "20",
  ]);
  const parsed = JSON.parse(output) as {
    ok: boolean;
    routes: Array<{ provider: string; symbol: string }>;
  };

  assert.equal(parsed.ok, true);
  assert.deepEqual(
    parsed.routes.map((route) => `${route.provider}:${route.symbol}`),
    ["mexc:VARA/USDT", "gateio:VARA/USDT"],
  );
});

test("routes command supports non-VARA assets without API credentials", () => {
  const output = runCli([
    "routes",
    "--side",
    "sell",
    "--asset",
    "USDC",
    "--quote",
    "USDT",
    "--amount",
    "20",
  ]);
  const parsed = JSON.parse(output) as {
    ok: boolean;
    asset: string;
    routes: Array<{ provider: string; asset: string; symbol: string }>;
  };

  assert.equal(parsed.ok, true);
  assert.equal(parsed.asset, "USDC");
  assert.deepEqual(
    parsed.routes.map((route) => `${route.provider}:${route.asset}:${route.symbol}`),
    ["mexc:USDC:USDC/USDT", "gateio:USDC:USDC/USDT"],
  );
});

test("onboarding command prints installed CLI commands", () => {
  const output = runCli(["onboarding"]);

  assert.match(output, /vara-agent onboarding understand/);
  assert.doesNotMatch(output, /npm run dev --/);
});

function runCli(args: string[]): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "vara-cli-test-"));

  return execFileSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      VARA_AGENT_ALLOWED_EXCHANGES: "mexc,gateio",
      VARA_AGENT_ALLOWED_QUOTES: "USDT",
      VARA_AGENT_DRY_RUN: "true",
    },
  });
}
