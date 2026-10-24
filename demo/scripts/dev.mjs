/**
 * `bun run dev` in demo/: the Book shop mock API (port 9100, restarts on
 * change) and the app (Vite, port 3400) together; Ctrl+C stops both. Either
 * one alone: `bun run api` / `bun run app`.
 */
import { spawn } from "node:child_process";

const run = (name, cmd, args) => {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    console.log(`[demo] ${name} exited (${code ?? "signal"}) — stopping the other one.`);
    stopAll(code ?? 0);
  });
  return child;
};

const children = [run("api", "bun", ["--watch", "api/src/index.ts"]), run("app", "bun", ["run", "app"])];

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  setTimeout(() => process.exit(code), 200);
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
