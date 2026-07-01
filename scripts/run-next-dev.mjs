import { existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const nextBuildDir = join(process.cwd(), ".next");

if (existsSync(nextBuildDir)) {
  rmSync(nextBuildDir, { recursive: true, force: true });
}

const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
