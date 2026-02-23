const WebSocket = require("ws");
const ws = new WebSocket("ws://localhost:6121/ws");

ws.on("open", () => {
  console.log("✅ Connected");
  
  // Try auth first
  ws.send(JSON.stringify({
    type: "module:authenticate",
    id: "auth-" + Date.now(),
    timestamp: new Date().toISOString(),
    source: { kind: "client" },
    data: {}
  }));
  console.log("🔐 Auth sent");
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: "module:announce",
      id: "ann-" + Date.now(),
      timestamp: new Date().toISOString(),
      source: { kind: "plugin", plugin: { id: "openclaw", version: "1.0.0", labels: { name: "OpenClaw" } }, id: "test" },
      data: { name: "OpenClaw", identity: { kind: "plugin", plugin: { id: "openclaw" }, id: "test" }, dependencies: [], configSchema: { id: "openclaw.config", version: 1 } }
    }));
    console.log("📢 Announced");
  }, 500);
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: "speak:text",
      id: "speak-" + Date.now(),
      timestamp: new Date().toISOString(),
      source: { kind: "plugin", plugin: { id: "openclaw" }, id: "test" },
      data: { text: "Testing with auth!", emotion: "happy" }
    }));
    console.log("🎙️ speak:text sent");
  }, 1500);
  
  setTimeout(() => ws.close(), 4000);
});

ws.on("message", (d) => {
  let text = d.toString();
  if (!text || text === "{}") return;
  try {
    let e = JSON.parse(text);
    if (e.json && typeof e.json === "object") e = e.json;
    console.log("📨:", e.type, e.data ? JSON.stringify(e.data).substring(0, 80) : "");
  } catch(err) {}
});

ws.on("close", () => console.log("🔌 Closed"));
