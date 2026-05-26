import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { printOk } from "../json.js";

type SkillTarget = "codex" | "agents" | "both";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const sourceSkillFile = path.join(packageRoot, "SKILL.md");
const sourceSkillsDir = path.join(packageRoot, "skills");
const sourceAgentsDir = path.join(packageRoot, "agents");

export async function installSkills(target: string, overwrite: boolean): Promise<void> {
  const normalizedTarget = parseTarget(target);
  const targetDirs = skillTargetDirs(normalizedTarget);
  const installed: Array<{ target: string; path: string; created: boolean }> = [];

  await assertSourceExists();

  for (const baseDir of targetDirs) {
    const destination = path.join(baseDir, "vara-trading-skill");
    const exists = await pathExists(destination);

    if (exists && !overwrite) {
      installed.push({
        target: baseDir,
        path: destination,
        created: false,
      });
      continue;
    }

    if (exists) {
      await fsp.rm(destination, { recursive: true, force: true });
    }

    await fsp.mkdir(destination, { recursive: true });
    await fsp.copyFile(sourceSkillFile, path.join(destination, "SKILL.md"));
    await fsp.cp(sourceSkillsDir, path.join(destination, "skills"), {
      recursive: true,
    });
    if (await pathExists(sourceAgentsDir)) {
      await fsp.cp(sourceAgentsDir, path.join(destination, "agents"), {
        recursive: true,
      });
    }

    installed.push({
      target: baseDir,
      path: destination,
      created: true,
    });
  }

  printOk({
    action: "install_skills",
    target: normalizedTarget,
    installed,
    message: "Skills installed. Restart the agent session if it does not pick up newly installed skills immediately.",
  });
}

function parseTarget(target: string): SkillTarget {
  if (target === "codex" || target === "agents" || target === "both") {
    return target;
  }

  throw new Error('target must be "codex", "agents", or "both"');
}

function skillTargetDirs(target: SkillTarget): string[] {
  const dirs: Record<Exclude<SkillTarget, "both">, string> = {
    codex: path.join(os.homedir(), ".codex", "skills"),
    agents: path.join(os.homedir(), ".agents", "skills"),
  };

  if (target === "both") {
    return [dirs.codex, dirs.agents];
  }

  return [dirs[target]];
}

async function assertSourceExists(): Promise<void> {
  if (!(await pathExists(sourceSkillFile))) {
    throw new Error(`Package SKILL.md not found: ${sourceSkillFile}`);
  }

  if (!(await pathExists(sourceSkillsDir))) {
    throw new Error(`Package skills directory not found: ${sourceSkillsDir}`);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}
