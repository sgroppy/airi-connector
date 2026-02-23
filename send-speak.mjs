import { AiriConnector, loadConfig } from './src/connector.js'

const config = loadConfig()
if (!config) {
  console.error('❌ Failed to load configuration')
  process.exit(1)
}

const connector = new AiriConnector(config)

connector.on('authenticated', () => {
  console.log('✅ Authenticated, sending speak:text...')
  
  // Send short TTS message
  connector.speak('AIRI is online and ready, Boss!', { emotion: 'happy' })
  
  // Disconnect after sending
  setTimeout(() => {
    connector.disconnect()
    process.exit(0)
  }, 2000)
})

connector.on('error', (err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})

console.log('🔌 Connecting to AIRI...')
connector.connect().catch(err => {
  console.error('❌ Connection failed:', err.message)
  process.exit(1)
})
