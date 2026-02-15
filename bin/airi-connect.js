#!/usr/bin/env node
/**
 * AIRI Connector CLI Tool for OpenClaw
 * 
 * Usage:
 *   airi-connect           # Connect to AIRI
 *   airi-connect status    # Show connection status  
 *   airi-connect say "Hello"  # Send message to AIRI
 *   airi-connect disconnect # Disconnect from AIRI
 */

import { AiriConnector, loadConfig } from '../src/connector.js'

const command = process.argv[2] || 'connect'
const args = process.argv.slice(3)

const config = loadConfig()
if (!config) {
  console.error('❌ Failed to load configuration from config/airi.yaml')
  process.exit(1)
}

const connector = new AiriConnector(config)

// Set up event handlers
connector.on('authenticated', () => {
  console.log('✅ Authenticated with AIRI')
})

connector.on('message', (data) => {
  const content = data.message?.content
  if (content) {
    console.log('🦊 AIRI:', content)
  }
})

connector.on('error', (err) => {
  console.error('❌ Error:', err.message || err)
})

connector.on('disconnected', () => {
  console.log('🔌 Disconnected from AIRI')
})

// Handle commands
async function main() {
  switch (command) {
    case 'connect':
      console.log('🔌 Connecting to AIRI...')
      try {
        await connector.connect()
        console.log('✅ Connected! Waiting for messages...')
        console.log('Press Ctrl+C to disconnect')
        
        // Keep running
        setInterval(() => {}, 1000)
      } catch (err) {
        console.error('❌ Connection failed:', err.message)
        process.exit(1)
      }
      break
      
    case 'status':
      const status = connector.getStatus()
      console.log('📊 AIRI Connector Status:')
      console.log(`  Connected: ${status.connected ? '✅' : '❌'}`)
      console.log(`  Authenticated: ${status.authenticated ? '✅' : '❌'}`)
      console.log(`  URL: ${status.url}`)
      console.log(`  Plugin ID: ${status.identity.plugin.id}`)
      console.log(`  Queue Length: ${status.queueLength}`)
      break
      
    case 'say':
      const message = args.join(' ')
      if (!message) {
        console.error('❌ Usage: airi-connect say "Your message here"')
        process.exit(1)
      }
      
      try {
        await connector.connect()
        const result = await connector.sendMessage(message)
        
        if (result.queued) {
          console.log('⏳ Message queued (waiting for authentication)')
        } else {
          console.log('📤 Message sent:', result.messageId)
        }
        
        // Wait for response
        setTimeout(() => {
          connector.disconnect()
          process.exit(0)
        }, 5000)
        
      } catch (err) {
        console.error('❌ Failed to send:', err.message)
        process.exit(1)
      }
      break
      
    case 'disconnect':
      connector.disconnect()
      console.log('👋 Disconnected')
      process.exit(0)
      break
      
    default:
      console.log('AIRI Connector for OpenClaw')
      console.log('')
      console.log('Usage:')
      console.log('  airi-connect           Connect to AIRI')
      console.log('  airi-connect status    Show connection status')
      console.log('  airi-connect say MSG   Send message to AIRI')
      console.log('  airi-connect disconnect Disconnect from AIRI')
      console.log('')
      console.log('Make sure AIRI desktop app is running on port 6121')
      process.exit(1)
  }
}

main()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...')
  connector.disconnect()
  process.exit(0)
})
