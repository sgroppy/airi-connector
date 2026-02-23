# AIRI OpenClaw Fork - Retrospective Notes

**Date:** 2026-02-15  
**Goal:** Enable OpenClaw to control AIRI's VRM avatar directly, bypassing the LLM  
**Status:** ✅ Implementation complete, build in progress  
**GitHub:** https://github.com/sgroppy/airi-openclaw

---

## What We Built

### The Problem
- AIRI's default protocol requires sending messages through `gen-ai:chat` → LLM → TTS → VRM
- This adds latency and cost (LLM tokens) when we already have the text we want spoken
- No direct way to trigger TTS + animation from external systems

### The Solution
Added `speak:text` event to AIRI's WebSocket protocol that:
1. Receives text directly from OpenClaw
2. Bypasses LLM entirely
3. Generates TTS audio immediately
4. Triggers VRM lip sync animation
5. Plays audio

---

## Technical Implementation

### 1. Protocol Extension (`packages/plugin-protocol/src/types/events.ts`)

**Added:**
```typescript
interface SpeakTextEvent {
  text: string           // Required: text to speak
  voiceId?: string       // Optional: override voice
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited'
  speed?: number         // Optional: speed multiplier
  metadata?: Record<string, unknown>  // For tracking
}

export const speakText = defineEventa<SpeakTextEvent>('speak:text')

// Added to ProtocolEvents interface:
'speak:text': SpeakTextEvent
```

**Lines changed:** ~35 lines

### 2. Event Routing (`packages/stage-ui/src/stores/mods/api/channel-server.ts`)

**Added:** `'speak:text'` to `basePossibleEvents` array

This tells the WebSocket server to accept and route these events.

### 3. Handler Implementation (`packages/stage-ui/src/stores/mods/api/context-bridge.ts`)

**Added:**
- Imports: `useSpeakingStore` from `../../audio`
- Store refs: destructured `activeSpeechProvider`, `activeSpeechVoiceId`, etc.
- Event handler: 66 lines of implementation

**Handler logic:**
```typescript
1. Receive 'speak:text' event
2. Validate speech is configured
3. Get TTS provider (ElevenLabs, etc.)
4. Generate audio buffer via speechStore.speech()
5. Create Blob → URL → Audio element
6. Set nowSpeaking.value = true (triggers VRM animation)
7. Play audio
8. On end/error: nowSpeaking.value = false
```

**Key insight:** Used `storeToRefs()` to properly access Pinia store reactive refs.

---

## Challenges Encountered

### 1. TypeScript Errors in Handler

**Problem:** Initial handler had type errors:
- `speechStore.activeSpeechVoiceId.value` - Property 'value' doesn't exist on type 'string'
- `speakingStore.startSpeaking()` - Method doesn't exist

**Root Cause:** Pinia stores return refs that need `storeToRefs()` destructuring

**Solution:**
```typescript
// Before (wrong):
const voice = speechStore.activeSpeechVoiceId.value

// After (correct):
const { activeSpeechVoiceId } = storeToRefs(speechStore)
const voice = activeSpeechVoiceId.value
```

### 2. Speaking Store API Mismatch

**Problem:** `useSpeakingStore` doesn't have `startSpeaking()` / `stopSpeaking()` methods

**Actual API:**
```typescript
{
  mouthOpenSize: Ref<number>
  nowSpeaking: Ref<boolean>
  nowSpeakingAvatarBorderOpacity: ComputedRef<number>
}
```

**Solution:** Directly set `nowSpeaking.value = true/false`

### 3. Build System Complexity

**Observation:** AIRI is a large monorepo with:
- 24+ packages
- pnpm workspaces
- TypeScript strict mode
- Custom linting (moeru-lint)
- Multiple apps (stage-web, stage-tamagotchi, server)

**Build time:** Several minutes on first run

---

## Decisions Made

### Decision 1: Fork vs. PR
**Chose:** Fork (not upstream PR)
**Reason:** This is a specialized use case (OpenClaw integration). Unsure if AIRI team wants this in core.

### Decision 2: Protocol Design
**Chose:** New `speak:text` event
**Alternatives considered:**
- Reuse `gen-ai:chat` with special prefix
- Add `bypassLLM` flag to existing events
- Create entirely new plugin type

**Rationale:** Clean separation, explicit intent, follows AIRI's event-driven architecture

### Decision 3: Animation Trigger
**Chose:** Set `nowSpeaking.value` directly
**Alternative:** Call custom animation methods

**Rationale:** Uses AIRI's existing lip-sync system. VRM responds to `nowSpeaking` state automatically.

---

## What's Left

### Immediate
1. ✅ ~~Protocol extension~~ - DONE
2. ✅ ~~Event routing~~ - DONE  
3. ✅ ~~Handler implementation~~ - DONE
4. ✅ ~~TypeScript fixes~~ - DONE
5. ⏳ **Full build** - IN PROGRESS (large monorepo)

### Testing (Next Steps)
1. Build completes successfully
2. Start AIRI desktop app with fork
3. Configure TTS provider (ElevenLabs)
4. Load VRM model (Captain Lobster)
5. Connect OpenClaw via WebSocket
6. Send test `speak:text` event
7. Verify: Audio plays + VRM animates

### Future Enhancements
- [ ] Add emotion-based animation triggers
- [ ] Support custom viseme/phoneme data
- [ ] Add callback/event when speech completes
- [ ] Support interrupting current speech

---

## Files Modified

| File | Changes | Notes |
|------|---------|-------|
| `packages/plugin-protocol/src/types/events.ts` | +40 lines | New interface + event + ProtocolEvents entry |
| `packages/stage-ui/src/stores/mods/api/channel-server.ts` | +1 line | Added to basePossibleEvents |
| `packages/stage-ui/src/stores/mods/api/context-bridge.ts` | +75 lines | Handler + imports + storeToRefs |

**Total:** ~116 lines added

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         OpenClaw                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐     │
│  │   Kimi LLM  │───►│  Generate text  │───►│  speak:text  │     │
│  └─────────────┘    └─────────────────┘    └──────┬───────┘     │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                                    ▼ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      AIRI Server (Port 6121)                     │
│                         ┌──────────┐                            │
│                         │  Route   │                            │
│                         └────┬─────┘                            │
│                              ▼                                   │
│                         ┌──────────┐                            │
│                         │speak:text│◄────── Our addition        │
│                         │ handler  │                            │
│                         └────┬─────┘                            │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AIRI Stage UI                               │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐   │
│  │speechStore  │───►│  ElevenLabs TTS │───►│  Audio Buffer  │   │
│  └─────────────┘    └─────────────────┘    └───────┬────────┘   │
│                                                    │            │
│  ┌─────────────┐    ┌─────────────────┐            │            │
│  │speakingStore│◄───│ nowSpeaking=true│◄───────────┘            │
│  │(nowSpeaking)│    └─────────────────┘                         │
│  └──────┬──────┘                                                 │
└─────────┼────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VRM Avatar                               │
│                    (Captain Lobster 🦞)                          │
│              Lip sync + Animation triggered                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Learnings

1. **Pinia stores need `storeToRefs()`** - Direct property access doesn't work for refs
2. **AIRI uses `nowSpeaking` boolean** - Not methods, for animation state
3. **Monorepo complexity** - Large build times, many packages
4. **Protocol design matters** - Clean events > flags/hacks
5. **Linting is strict** - moeru-lint auto-fixes on commit

---

## Commands Reference

```bash
# Clone and setup
cd ~/code/airi-openclaw-fork
pnpm install

# Build
pnpm run build

# Start (dev mode)
pnpm run dev

# Git
git remote add fork https://github.com/sgroppy/airi-openclaw
git push fork main
```

---

## Retrospective Discussion Points

1. **Should this be upstreamed?** - Does AIRI team want direct TTS events?
2. **Alternative architectures** - Could we use a plugin instead of core modification?
3. **Testing strategy** - How to test without full AIRI setup?
4. **Documentation** - Should we document this for other integrators?
5. **Future features** - What else does OpenClaw need from AIRI?

---

## Links

- **Fork:** https://github.com/sgroppy/airi-openclaw
- **Original:** https://github.com/moeru-ai/airi
- **OpenClaw Skill:** `~/.openclaw/workspace-expertclawbutler/skills/airi-connector/`
- **This Doc:** `FORK_SUMMARY.md`

---

*Last updated: 2026-02-15 09:45 GMT*
