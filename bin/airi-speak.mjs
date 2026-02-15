#!/usr/bin/env node
/**
 * AIRI Speak CLI - Quick speech command for OpenClaw skill
 * Usage: node airi-speak.mjs "Hello world" [emotion] [speed]
 */

import { stringify } from 'superjson';
import WebSocket from 'ws';

const text = process.argv[2] || 'Hello from OpenClaw!';
const emotion = process.argv[3] || 'happy';
const speed = parseFloat(process.argv[4]) || 1.0;

const ws = new WebSocket('ws://localhost:6121/ws');

ws.on('open', () => {
  // Announce module
  ws.send(stringify({
    type: 'module:announce',
    id: 'a-' + Date.now(),
    timestamp: new Date().toISOString(),
    source: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 't' },
    data: { name: 'OpenClaw', identity: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 't' } }
  }));

  // Send speak event
  setTimeout(() => {
    ws.send(stringify({
      type: 'speak:text',
      id: 's-' + Date.now(),
      timestamp: new Date().toISOString(),
      source: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 't' },
      data: { text, emotion, speed }
    }));
    
    setTimeout(() => ws.close(), 300);
  }, 200);
});

ws.on('error', (err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
