#!/usr/bin/env node
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:6121/ws');

ws.on('open', () => {
  console.log('✅ Connected');
  
  // Announce
  ws.send(JSON.stringify({
    type: 'module:announce',
    id: `a-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 'oc' },
    data: {
      name: 'OpenClaw',
      identity: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 'oc' },
      possibleEvents: ['speak:text']
    }
  }));
  
  // Send speak:text
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'speak:text',
      id: `s-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 'oc' },
      data: { text: 'Hello Boss, AIRI is online!', emotion: 'happy', speed: 1.0 }
    }));
    console.log('🎙️ Sent speak:text');
    setTimeout(() => ws.close(), 1000);
  }, 500);
});

ws.on('error', (e) => console.error('❌', e.message));
ws.on('close', () => console.log('🔌 Done'));
