// PreToolUse hook for Edit, MultiEdit and Write: blocks changes to .env files.
// Exit 2 stops the tool call and sends the message back to the agent.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const filePath = input.tool_input?.file_path ?? "";
const name = basename(filePath);

// .env.example is a committed template, so it stays editable.
const isEnvFile =
  (name === ".env" || name.startsWith(".env.")) && name !== ".env.example";

if (isEnvFile) {
  process.stderr.write(
    `Blocked: ${name} holds local secrets and must not be edited by the agent. Ask the user to change it.`,
  );
  process.exit(2);
}
