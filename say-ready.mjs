#!/usr/bin/env node
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:6121/ws');

ws.on('open', () => {
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
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'speak:text',
      id: `s-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: { kind: 'plugin', plugin: { id: 'openclaw' }, id: 'oc' },
      data: { text: 'Ready when you are, Boss!', emotion: 'happy', speed: 1.0 }
    }));
    console.log('🎙️ Sent: Ready when you are, Boss!');
    setTimeout(() => ws.close(), 500);
  }, 300);
});

ws.on('close', () => console.log('🔌 Done'));
