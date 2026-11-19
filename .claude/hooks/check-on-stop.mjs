// Stop hook: runs `npm run check:quick` when the agent finishes a turn.
// On failure it blocks once (exit 2, output fed back to the agent). When the
// agent is already continuing because of a previous block (stop_hook_active),
// it lets the turn end so the hook cannot loop forever.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MAX_OUTPUT_CHARS = 6000;

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const result = spawnSync("npm", ["run", "check:quick"], {
  cwd: projectDir,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

if (result.status === 0) {
  process.exit(0);
}

const output = `${result.error?.message ?? ""}${result.stdout ?? ""}${result.stderr ?? ""}`;
const tail = output.slice(-MAX_OUTPUT_CHARS);
const message = [
  "`npm run check:quick` failed. Fix the failures below, then finish the turn again.",
  tail,
].join("\n");

if (input.stop_hook_active) {
  // Already blocked once this turn. Let the turn end and report the failure.
  process.stderr.write(
    `${message}\n\nLeaving the failure unfixed because the check already blocked once this turn.\n`,
  );
  process.exit(0);
}

process.stderr.write(message);
process.exit(2);
