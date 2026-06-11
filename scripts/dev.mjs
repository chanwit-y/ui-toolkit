import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function killMatchingProcesses(pattern, label) {
  try {
    const output = execSync(`pgrep -f "${pattern}"`, { encoding: "utf8" });
    const pids = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number);

    if (pids.length > 0) {
      console.log(`Cleaning up ${pids.length} stale ${label} process(es)...`);
      execSync(`kill -9 ${pids.join(" ")}`, { stdio: "ignore" });
    }
  } catch {
    // pgrep exits 1 when no processes match.
  }
}

function killPort(port) {
  try {
    const output = execSync(`lsof -ti :${port}`, { encoding: "utf8" });
    const pids = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number);

    if (pids.length > 0) {
      console.log(
        `Cleaning up ${pids.length} process(es) on port ${port}...`,
      );
      execSync(`kill -9 ${pids.join(" ")}`, { stdio: "ignore" });
    }
  } catch {
    // lsof exits 1 when the port is free.
  }
}

function cleanupStaleDevProcesses() {
  killMatchingProcesses(
    `${root}/node_modules.*esbuild --service=`,
    "esbuild",
  );
  killMatchingProcesses(`${root}/node_modules/.bin/vite`, "vite");
  killPort(9000);
  killPort(3200);
}

function run(cwd, script) {
  const child = spawn("bun", ["run", script], {
    cwd: path.join(root, cwd),
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      process.exitCode = code;
    } else if (signal) {
      process.exitCode = 1;
    }
  });

  return child;
}

cleanupStaleDevProcesses();
execSync("node scripts/dedupe-esbuild.mjs", { cwd: root, stdio: "inherit" });

execSync("bun run build", {
  cwd: path.join(root, "packages/ui"),
  stdio: "inherit",
});

const children = [
  run("packages/ui", "dev"),
  run("apps/api", "dev"),
];

setTimeout(() => {
  children.push(run("apps/example", "dev"));
}, 2000);

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
