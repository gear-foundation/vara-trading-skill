import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { envTemplate } from "../envTemplate.js";
import { printOk } from "../json.js";

const configDir = path.join(os.homedir(), ".vara-trading-agent");
const envPath = path.join(configDir, ".env");

export async function initConfig(overwrite: boolean): Promise<void> {
  await fsp.mkdir(configDir, { recursive: true });

  const exists = await fileExists(envPath);

  if (exists && !overwrite) {
    printOk({
      action: "init_config",
      created: false,
      exists: true,
      path: envPath,
      message: "Config already exists and was not changed.",
      next_steps: [
        `Edit ${envPath} locally to add or update API keys.`,
        "Run onboarding with: vara-agent onboarding interactive",
        "Use --overwrite only if you intentionally want to replace the existing config template.",
      ],
    });
    return;
  }

  await fsp.writeFile(envPath, envTemplate, {
    encoding: "utf8",
    mode: 0o600,
  });

  await fsp.chmod(envPath, 0o600);

  printOk({
    action: "init_config",
    created: true,
    exists: true,
    path: envPath,
    message: "Config template created. Edit this file locally and add API keys only on your machine.",
    next_steps: [
      `Edit ${envPath} locally to add API keys.`,
      "Run onboarding with: vara-agent onboarding interactive",
    ],
  });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}
