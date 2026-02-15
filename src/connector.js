/**
 * AIRI Connector - Main Connection Handler
 * 
 * Connects OpenClaw to Project AIRI desktop app via WebSocket.
 * Based on @proj-airi/server-sdk patterns.
 */

import WebSocket from 'ws'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load configuration
function loadConfig() {
  const configPath = join(__dirname, '../config/airi.yaml')
  try {
    const configFile = readFileSync(configPath, 'utf8')
    return yaml.load(configFile)
  } catch (err) {
    console.error('Failed to load config:', err.message)
    return null
  }
}

class AiriConnector {
  constructor(config) {
    this.config = config
    this.ws = null
    this.connected = false
    this.authenticated = false
    this.reconnectAttempts = 0
    this.heartbeatTimer = null
    this.messageQueue = []
    this.eventListeners = new Map()
    
    // Plugin identity
    this.identity = {
      kind: 'plugin',
      plugin: {
        id: config.identity?.pluginId || 'openclaw-bridge',
        version: config.identity?.version || '1.0.0',
        labels: {
          name: config.identity?.name || 'OpenClaw Bridge',
          description: config.identity?.description || 'Bridge between OpenClaw and AIRI'
        }
      },
      id: `${config.identity?.pluginId || 'openclaw-bridge'}-${Date.now().toString(36)}`
    }
    
    // Connection settings
    this.url = config.airi?.url || 'ws://localhost:6121/ws'
    this.autoReconnect = config.airi?.connection?.autoReconnect !== false
    this.maxReconnectAttempts = config.airi?.connection?.maxReconnectAttempts || -1
  }

  // Generate unique event ID
  createEventId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  // Generate unique message ID  
  createMessageId() {
    return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }

  // Connect to AIRI
  async connect() {
    if (this.connected || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('Already connected or connecting')
      return
    }

    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to AIRI at ${this.url}...`)
      
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected')
          this.connected = true
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.authenticate()
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error.message)
          this.emit('error', error)
          reject(error)
        }
        
        this.ws.onclose = () => {
          console.log('🔌 WebSocket closed')
          this.connected = false
          this.authenticated = false
          this.stopHeartbeat()
          this.emit('disconnected')
          
          if (this.autoReconnect) {
            this.scheduleReconnect()
          }
        }
        
      } catch (err) {
        console.error('Failed to create WebSocket:', err.message)
        reject(err)
      }
    })
  }

  // Authenticate with AIRI
  authenticate() {
    const authEvent = {
      type: 'module:authenticate',
      id: this.createEventId(),
      timestamp: new Date().toISOString(),
      source: this.identity,
      data: {
        token: this.config.airi?.auth?.token || null,
        identity: this.identity
      }
    }
    
    console.log('🔐 Sending authentication...')
    this.send(authEvent)
  }

  // Announce plugin capabilities
  announce() {
    const announceEvent = {
      type: 'module:announce',
      id: this.createEventId(),
      timestamp: new Date().toISOString(),
      source: this.identity,
      data: {
        identity: this.identity,
        dependencies: [],
        configSchema: {
          id: 'openclaw.bridge.config',
          version: 1
        },
        contributions: {
          capabilities: ['chat.send', 'chat.receive'],
          providers: [{
            id: 'openclaw-chat',
            type: 'chat-source'
          }]
        }
      }
    }
    
    console.log('📢 Announcing plugin to AIRI...')
    this.send(announceEvent)
  }

  // Handle incoming messages
  handleMessage(data) {
    try {
      const event = JSON.parse(data)
      console.log('📨 Received:', event.type)
      
      switch (event.type) {
        case 'module:authenticated':
          if (event.data?.authenticated) {
            console.log('✅ Authenticated with AIRI')
            this.authenticated = true
            this.announce()
            this.emit('authenticated', event.data)
            this.processMessageQueue()
          } else {
            console.error('❌ Authentication failed:', event.data?.message)
            this.emit('auth_failed', event.data)
          }
          break
          
        case 'output:gen-ai:chat:message':
          console.log('💬 AI response:', event.data?.message?.content)
          this.emit('message', event.data)
          break
          
        case 'output:gen-ai:chat:complete':
          console.log('✅ Response complete')
          this.emit('complete', event.data)
          break
          
        case 'transport:connection:heartbeat':
          if (event.data?.kind === 'ping') {
            this.sendHeartbeatPong()
          }
          break
          
        case 'error':
          console.error('❌ AIRI error:', event.data?.message)
          this.emit('error', event.data)
          break
          
        default:
          console.log('ℹ️  Unhandled event:', event.type)
          this.emit(event.type, event.data)
      }
      
    } catch (err) {
      console.error('Failed to parse message:', err.message)
    }
  }

  // Send message to AI character
  async sendMessage(text, options = {}) {
    if (!this.authenticated) {
      console.log('⏳ Not authenticated, queueing message...')
      this.messageQueue.push({ text, options })
      return { queued: true }
    }

    const userMessage = {
      role: 'user',
      content: text,
      id: this.createMessageId()
    }

    const chatEvent = {
      type: 'gen-ai:chat',
      id: this.createEventId(),
      timestamp: new Date().toISOString(),
      source: this.identity,
      data: {
        message: userMessage,
        contexts: {},
        composedMessage: [userMessage],
        input: {
          source: 'openclaw-bridge',
          timestamp: Date.now()
        }
      }
    }

    console.log('📤 Sending message to AIRI:', text.substring(0, 50))
    this.send(chatEvent)
    return { sent: true, messageId: userMessage.id }
  }

  // Send raw event
  send(event) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Cannot send: WebSocket not open')
      return false
    }
    
    try {
      this.ws.send(JSON.stringify(event))
      return true
    } catch (err) {
      console.error('Failed to send:', err.message)
      return false
    }
  }

  // Send heartbeat pong
  sendHeartbeatPong() {
    this.send({
      type: 'transport:connection:heartbeat',
      id: this.createEventId(),
      timestamp: new Date().toISOString(),
      source: this.identity,
      data: { kind: 'pong' }
    })
  }

  // Start heartbeat
  startHeartbeat() {
    const interval = this.config.airi?.connection?.heartbeatInterval || 30000
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.send({
          type: 'transport:connection:heartbeat',
          id: this.createEventId(),
          timestamp: new Date().toISOString(),
          source: this.identity,
          data: { kind: 'ping' }
        })
      }
    }, interval)
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // Process queued messages
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { text, options } = this.messageQueue.shift()
      this.sendMessage(text, options)
    }
  }

  // Schedule reconnect
  scheduleReconnect() {
    if (this.maxReconnectAttempts !== -1 && 
        this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }

    const delay = Math.min(2 ** this.reconnectAttempts * 1000, 30000)
    console.log(`⏳ Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1})`)
    
    setTimeout(() => {
      this.reconnectAttempts++
      this.connect().catch(() => {
        // Error handled in connect()
      })
    }, delay)
  }

  // Event emitter pattern
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(handler)
  }

  off(event, handler) {
    this.eventListeners.get(event)?.delete(handler)
  }

  emit(event, data) {
    this.eventListeners.get(event)?.forEach(handler => {
      try {
        handler(data)
      } catch (err) {
        console.error('Event handler error:', err.message)
      }
    })
  }

  // Disconnect
  disconnect() {
    this.autoReconnect = false
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.connected = false
    this.authenticated = false
    console.log('🔌 Disconnected from AIRI')
  }

  // Get status
  getStatus() {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      url: this.url,
      identity: this.identity,
      queueLength: this.messageQueue.length
    }
  }
}

// Export for use as module
export { AiriConnector, loadConfig }

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig()
  if (!config) {
    console.error('Failed to load configuration')
    process.exit(1)
  }

  const connector = new AiriConnector(config)
  
  // Event handlers
  connector.on('authenticated', () => {
    console.log('🎉 Ready to chat with AIRI!')
    
    // Send test message
    setTimeout(() => {
      connector.sendMessage('Hello from OpenClaw! Can you hear me?')
    }, 1000)
  })
  
  connector.on('message', (data) => {
    console.log('🦊 AIRI says:', data.message?.content)
  })
  
  connector.on('error', (err) => {
    console.error('Error:', err)
  })
  
  // Connect
  connector.connect().catch(err => {
    console.error('Connection failed:', err.message)
    process.exit(1)
  })
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Disconnecting...')
    connector.disconnect()
    process.exit(0)
  })
}
