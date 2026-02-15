#!/usr/bin/env node
/**
 * Test AIRI speak:text event
 */

import WebSocket from 'ws';

const WS_URL = process.env.AIRI_URL || 'ws://localhost:6121/ws';

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to AIRI');
  
  // Send announce
  const announce = {
    type: 'module:announce',
    id: `announce-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: { 
      kind: 'plugin', 
      plugin: { 
        id: 'openclaw-bridge',
        version: '1.0.0',
        labels: {
          name: 'OpenClaw Bridge'
        }
      }, 
      id: 'openclaw-test' 
    },
    data: {
      name: 'OpenClaw Bridge',
      identity: { 
        kind: 'plugin', 
        plugin: { id: 'openclaw-bridge' }, 
        id: 'openclaw-test' 
      },
      dependencies: [],
      configSchema: { id: 'openclaw.config', version: 1 },
      possibleEvents: ['speak:text', 'chat:message']
    }
  };
  console.log('📢 Sending module:announce');
  ws.send(JSON.stringify(announce));
  
  // Wait then send speak:text
  setTimeout(() => {
    const speak = {
      type: 'speak:text',
      id: `speak-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: { 
        kind: 'plugin', 
        plugin: { id: 'openclaw-bridge' }, 
        id: 'openclaw-test' 
      },
      data: { 
        text: 'Hello Captain Lobster! Can you hear me?',
        emotion: 'happy',
        speed: 1.0
      }
    };
    console.log('🎙️ Sending speak:text');
    ws.send(JSON.stringify(speak));
    
    // Close after 2 seconds
    setTimeout(() => {
      console.log('🔌 Closing connection');
      ws.close();
    }, 2000);
  }, 500);
});

ws.on('message', (data) => {
  const text = data.toString();
  // Skip empty/heartbeat-only messages for cleaner logs
  if (!text || text === '{}' || text.trim() === '') return;
  
  try {
    const event = JSON.parse(text);
    if (!event.type) return;
    
    // Skip routine events
    if (event.type === 'transport:connection:heartbeat') return;
    if (event.type === 'registry:modules:sync') return;
    
    console.log('📨 Received:', event.type);
    
    // Log important responses
    if (event.type === 'error') {
      console.error('❌ Error:', event.data?.message);
    }
  } catch (e) {
    // Ignore parse errors for empty messages
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
});
