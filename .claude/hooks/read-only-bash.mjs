// PreToolUse hook for Bash, used by the reviewer subagent: lets through only
// commands that read. Exit 2 stops the tool call and sends the message back.
//
// Every command in a pipeline or list must start with an allowed program, and
// git must use a read-only subcommand. Redirects, command substitution and the
// flags that write files or run other programs are refused, so nothing can
// be changed. sed, awk and uniq are left out: they can write files from their
// script or arguments. The Read tool covers reading line ranges.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const READ_PROGRAMS = new Set([
  "git", "grep", "rg", "ls", "cat", "head", "tail", "wc", "find", "sort",
  "diff", "cut", "tr", "pwd", "echo", "stat",
]);
const READ_GIT = new Set([
  "diff", "log", "show", "status", "blame", "branch", "rev-parse",
  "merge-base", "ls-files", "grep", "shortlog", "describe",
]);
// git branch flags that create, rename or delete a branch.
const WRITE_BRANCH_FLAGS =
  /\s(-[a-zA-Z]*[dDmMcCf]|--(delete|move|copy|force|set-upstream-to|unset-upstream|edit-description))\b/;

export function refusal(command) {
  // Substitution runs even inside double quotes, so check the raw text.
  if (/`|\$\(|<\(|>\(/.test(command)) return "command substitution is not allowed";
  // Quoted text is an argument, such as a grep pattern, so blank it out before
  // looking for redirects and command separators.
  const unquoted = command
    .replace(/'[^']*'|"(\\.|[^"\\])*"/g, "''")
    .replace(/\s2>&1\b/g, " ")
    .replace(/\s\d?>\s*\/dev\/null\b/g, " ");
  if (/[<>]/.test(unquoted)) return "redirects are not allowed";
  for (const part of unquoted.split(/\|\||&&|[|;&\n]/)) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const program = words[0];
    if (!READ_PROGRAMS.has(program)) return `${program} is not a read-only command`;
    if (program === "git") {
      const subcommand = words.slice(1).find((w) => !w.startsWith("-")) ?? "";
      if (!READ_GIT.has(subcommand)) return `git ${subcommand} is not read-only`;
      if (subcommand === "branch" && WRITE_BRANCH_FLAGS.test(part)) {
        return "git branch may only list branches";
      }
    }
    if (program === "find" && /\s-(delete|exec|execdir|ok|okdir|fprint\w*|fls)\b/.test(part)) {
      return "find may only list files";
    }
    if (program === "git" && /\s(--output\b|-O\b|--open-files-in-pager)/.test(part)) {
      return "git may not write files or open other programs";
    }
    if (program === "sort" && /\s(-[a-zA-Z]*o|--output)/.test(part)) {
      return "sort may not write files";
    }
    if (program === "rg" && /\s--pre\b/.test(part)) return "rg may not run other programs";
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const reason = refusal(input.tool_input?.command ?? "");
  if (reason) {
    process.stderr.write(
      `Blocked: ${reason}. The reviewer only reads. Report what you would change instead.`,
    );
    process.exit(2);
  }
}
