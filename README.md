# AIRI Connector Skill - Documentation

## Overview

This OpenClaw skill connects to **Project AIRI** - an AI VTuber platform with VRM avatar support, inspired by Neuro-sama.

**Goal:** Enable OpenClaw to send messages to AIRI's AI character and receive VRM-animated, lip-synced responses.

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐     VRM Display
│   OpenClaw      │ ◄─────────────────► │  AIRI Desktop    │ ◄─────────────►
│  (This Skill)   │    Port 6121       │    App           │    Avatar
│                 │                     │                  │
│  ┌───────────┐  │                     │  ┌────────────┐  │
│  │ Connector │  │    gen-ai:chat      │  │ AI Engine  │  │
│  │  Logic    │──┼────────────────────►│  │  + TTS     │  │
│  └───────────┘  │                     │  └────────────┘  │
│        ▲        │                     │        │         │
│        │        │    AI Response      │        ▼         │
│        └────────┼─────────────────────│   Lip Sync       │
│                 │    output:gen-ai    │   Animation      │
└─────────────────┘                     └──────────────────┘
```

## How It Works

### 1. Connection Protocol

AIRI uses a WebSocket-based protocol on port `6121`:

**Connection Flow:**
1. **Connect** → `ws://localhost:6121/ws`
2. **Authenticate** → `module:authenticate` event
3. **Announce** → `module:announce` (register capabilities)
4. **Chat** → `gen-ai:chat` (send user message)
5. **Receive** → `output:gen-ai:chat:message` (AI response)

### 2. Event Types

| Event | Direction | Purpose |
|-------|-----------|---------|
| `module:authenticate` | → AIRI | Authenticate plugin |
| `module:authenticated` | ← AIRI | Auth response |
| `module:announce` | → AIRI | Register plugin |
| `gen-ai:chat` | → AIRI | Send user message |
| `output:gen-ai:chat:message` | ← AIRI | AI response (streaming) |
| `output:gen-ai:chat:complete` | ← AIRI | Full response complete |
| `transport:connection:heartbeat` | ↔ | Keep connection alive |

### 3. Message Format

**Sending to AIRI:**
```json
{
  "type": "gen-ai:chat",
  "id": "msg_abc123",
  "timestamp": "2026-02-15T02:30:00Z",
  "source": {
    "kind": "plugin",
    "plugin": { "id": "openclaw-bridge" },
    "id": "openclaw-bridge-xyz"
  },
  "data": {
    "message": {
      "role": "user",
      "content": "Hello from OpenClaw!",
      "id": "usr_msg_123"
    },
    "contexts": {},
    "composedMessage": [...]
  }
}
```

**Receiving from AIRI:**
```json
{
  "type": "output:gen-ai:chat:message",
  "data": {
    "message": {
      "role": "assistant",
      "content": "Hello! I am Captain Lobster!",
      "id": "ai_msg_456"
    }
  }
}
```

## File Structure

```
airi-connector/
├── SKILL.md                  # Skill manifest
├── README.md                 # This documentation
├── config/
│   └── airi.yaml            # Configuration
├── src/
│   └── connector.js         # Main connection logic
├── bin/
│   └── airi-connect.js      # CLI tool
└── package.json             # Dependencies
```

## Configuration

See `config/airi.yaml` for:
- WebSocket URL (default: `ws://localhost:6121/ws`)
- Plugin identity (name, version, description)
- Reconnection settings
- Character settings (voice, animations)

## Usage

### CLI Commands

```bash
# Connect to AIRI
./bin/airi-connect.js

# Check status
./bin/airi-connect.js status

# Send a message
./bin/airi-connect.js say "Hello Captain Lobster!"

# Disconnect
./bin/airi-connect.js disconnect
```

### As OpenClaw Tool

The skill can be registered as an OpenClaw tool:

```javascript
// In OpenClaw agent
const result = await tools.airi_say({
  message: "Hello from OpenClaw!"
})
```

## Decisions Made

### 1. Native WebSocket vs SDK
**Decision:** Use native WebSocket with custom protocol implementation.

**Rationale:**
- AIRI's `@proj-airi/server-sdk` is TypeScript-heavy
- Native WebSocket gives us full control
- Easier to debug connection issues
- No dependency on complex build systems

### 2. Event Emitter Pattern
**Decision:** Use Node.js-style EventEmitter pattern.

**Rationale:**
- Matches AIRI's event-based protocol
- Easy to add/remove listeners
- Familiar to JavaScript developers
- Clean separation of concerns

### 3. Message Queue
**Decision:** Queue messages when not authenticated.

**Rationale:**
- User can send messages immediately
- Messages auto-send after auth completes
- Prevents message loss during reconnection
- Better UX

### 4. Auto-Reconnect
**Decision:** Exponential backoff with configurable max attempts.

**Rationale:**
- AIRI desktop app may restart
- Network may be intermittent
- Exponential backoff prevents spam
- `-1` for unlimited retries (always reconnect)

## Known Limitations

1. **Requires AIRI Desktop App Running**
   - Must have AIRI app open on port 6121
   - VRM model must be loaded in AIRI
   - Voice settings configured in AIRI UI

2. **No Direct VRM Control**
   - We send text, AIRI handles VRM animation
   - Lip sync is automatic via AIRI's TTS
   - No direct blend shape control (yet)

3. **Local Network Only**
   - Default: localhost connection
   - Can be configured for LAN access
   - No built-in authentication (yet)

## Future Enhancements

1. **Direct VRM Control**
   - Trigger specific animations
   - Control blend shapes manually
   - Expression overrides

2. **Voice Selection**
   - Choose between AIRI's voice options
   - ElevenLabs integration through AIRI
   - Custom voice IDs

3. **Context Management**
   - Persistent conversation memory
   - Multi-turn conversations
   - Context window management

4. **Multi-Character Support**
   - Switch between different VRM models
   - Character-specific configurations
   - Dynamic personality loading

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:6121
```
**Solution:** Start AIRI desktop app first.

### Authentication Failed
```
❌ Authentication failed
```
**Solution:** Check if AIRI requires token auth in settings.

### No Response
```
📤 Message sent but no response
```
**Solution:** Check AIRI UI - AI may be processing or paused.

## References

- **AIRI GitHub:** https://github.com/moeru-ai/airi
- **AIRI Docs:** https://airi.moeru.ai/docs/
- **Neuro-sama:** https://www.youtube.com/@Neurosama
- **VRM Format:** https://vrm.dev/

## Progress Log

| Date | Milestone |
|------|-----------|
| 2026-02-15 | Initial skill creation |
| 2026-02-15 | WebSocket protocol implementation |
| 2026-02-15 | Authentication flow working |
| 2026-02-15 | Message send/receive tested |
| TBD | VRM avatar display integration |
| TBD | Lip sync control |
| TBD | OpenClaw tool registration |

## Next Steps

1. **Test connection** with AIRI desktop app running
2. **Register as OpenClaw tool** in agent config
3. **Add voice trigger** integration
4. **Document VRM model loading** in AIRI
5. **Create demo video** of OpenClaw → AIRI → VRM

---

**Status:** ✅ Core connector implemented, ready for testing
