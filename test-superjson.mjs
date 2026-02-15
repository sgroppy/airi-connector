import { stringify } from 'superjson';
import WebSocket from 'ws';

const ws = new WebSocket("ws://localhost:6121/ws");

ws.on("open", () => {
  console.log("✅ Connected");
  
  // Announce with superjson
  const announce = stringify({
    type: "module:announce",
    id: "ann-" + Date.now(),
    timestamp: new Date().toISOString(),
    source: { kind: "plugin", plugin: { id: "openclaw", version: "1.0.0", labels: { name: "OpenClaw" } }, id: "test" },
    data: { name: "OpenClaw", identity: { kind: "plugin", plugin: { id: "openclaw" }, id: "test" }, dependencies: [], configSchema: { id: "openclaw.config", version: 1 } }
  });
  ws.send(announce);
  console.log("📢 Announced (superjson)");
  
  setTimeout(() => {
    // Send speak:text with superjson
    const speak = stringify({
      type: "speak:text",
      id: "speak-" + Date.now(),
      timestamp: new Date().toISOString(),
      source: { kind: "plugin", plugin: { id: "openclaw" }, id: "test" },
      data: { text: "🎉 SUPERJSON TEST! Can you hear me Captain Lobster?", emotion: "excited" }
    });
    ws.send(speak);
    console.log("🎙️ speak:text sent (superjson)!");
  }, 1000);
  
  setTimeout(() => ws.close(), 5000);
});

ws.on("close", () => console.log("🔌 Closed"));
