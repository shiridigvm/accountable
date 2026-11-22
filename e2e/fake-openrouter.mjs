// A scripted stand-in for OpenRouter's chat completions API, for the end-to-end
// tests only (plan choice 10). No test calls the real OpenRouter.
//
//   node e2e/fake-openrouter.mjs <port>
//
// It answers by phrases in the last user message, with real tool calls, so the
// backend's loop, lookups and proposal checks all run for real. The round is the
// number of tool results since that message. The reply shape follows OpenRouter's
// docs: choices[0].message, with content and tool_calls.
import http from "node:http";

const port = Number(process.argv[2]);
const KEY = "e2e-fake-key";

function lastUserIndex(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return i;
  }
  return -1;
}

function lastToolResult(messages) {
  const last = messages[messages.length - 1];
  return last?.role === "tool" ? JSON.parse(last.content) : null;
}

function text(content) {
  return { role: "assistant", content };
}

function call(round, name, args, content = null) {
  return {
    role: "assistant",
    content,
    tool_calls: [
      {
        id: `call_${round}`,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
}

function named(list, name) {
  return list.find((item) => item.name === name);
}

// Each script takes the round and the latest tool result, and gives the message.
const SCRIPTS = [
  {
    phrase: "open deals with kestrel",
    reply(round, result) {
      if (round === 0) return call(round, "search", { q: "Kestrel" });
      if (round === 1) {
        const deal = named(result.deals, "Kestrel Freight audit");
        return call(round, "get_record", { kind: "deal", id: deal.id });
      }
      return text(
        `Kestrel Freight has one open deal, Kestrel Freight audit, in ${result.record.stage}.`,
      );
    },
  },
  {
    phrase: "move the kestrel audit to negotiation",
    reply(round, result) {
      if (round === 0)
        return call(round, "search", { q: "Kestrel Freight audit" });
      const deal = named(result.deals, "Kestrel Freight audit");
      return call(
        round,
        "propose_change",
        {
          kind: "deal",
          action: "update",
          id: deal.id,
          fields: { stage: "Negotiation" },
        },
        "I can move Kestrel Freight audit to Negotiation.",
      );
    },
  },
  {
    phrase: "log a call with priya",
    reply(round, result) {
      if (round === 0) return call(round, "search", { q: "Priya Nair" });
      const contact = named(result.contacts, "Priya Nair");
      return call(round, "propose_change", {
        kind: "activity",
        action: "create",
        fields: {
          type: "call",
          description: "Called Priya about the audit scope",
          contact_id: contact.id,
        },
      });
    },
  },
  {
    phrase: "delete",
    reply() {
      return text(
        "I can't delete records. I can only look things up and propose creating or updating one record.",
      );
    },
  },
  {
    phrase: "latest with ivy",
    reply(round, result) {
      if (round === 0) return call(round, "search", { q: "Ivy" });
      if (round === 1) {
        const contact = result.contacts[0];
        return call(round, "get_record", { kind: "contact", id: contact.id });
      }
      return text(
        `The latest note on ${result.record.name} says: "${result.timeline[0].text}"`,
      );
    },
  },
];

function completion(message) {
  return {
    id: "gen-e2e",
    object: "chat.completion",
    model: "e2e/fake",
    choices: [
      {
        index: 0,
        finish_reason: message.tool_calls ? "tool_calls" : "stop",
        message,
      },
    ],
  };
}

function answer(body) {
  const messages = body.messages;
  const userIndex = lastUserIndex(messages);
  const question = messages[userIndex].content.toLowerCase();
  const round = messages
    .slice(userIndex)
    .filter((m) => m.role === "tool").length;
  const script = SCRIPTS.find((s) => question.includes(s.phrase));
  if (!script) return text("I can answer questions about your records.");
  return script.reply(round, lastToolResult(messages));
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    send(response, 200, { ok: true });
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/v1/chat/completions") {
    send(response, 404, { error: { code: 404, message: "Not found" } });
    return;
  }
  if (request.headers.authorization !== `Bearer ${KEY}`) {
    send(response, 401, { error: { code: 401, message: "No auth" } });
    return;
  }
  let raw = "";
  request.on("data", (chunk) => (raw += chunk));
  request.on("end", () => {
    const body = JSON.parse(raw);
    const question = body.messages[lastUserIndex(body.messages)].content;
    if (question.toLowerCase().includes("rate limit me")) {
      send(response, 429, { error: { code: 429, message: "Rate limited" } });
      return;
    }
    send(response, 200, completion(answer(body)));
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Fake OpenRouter on http://127.0.0.1:${port}`);
});
