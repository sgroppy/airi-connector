---
name: airi-connector
version: "1.0.0"
description: |
  Connect OpenClaw to Project AIRI - AI VTuber platform with VRM avatar support.
  
  Features:
  - WebSocket connection to AIRI desktop app (port 6121)
  - Send messages to AIRI's AI character
  - Receive VRM-animated responses with lip sync
  - Real-time avatar control and speech synthesis
  
  Requirements:
  - AIRI desktop app running (https://github.com/moeru-ai/airi)
  - VRM model loaded in AIRI
  
author: Expert Claw
license: MIT

config:
  path: ./config/airi.yaml
  description: AIRI connection settings and character config

commands:
  airi:
    description: Manage AIRI connection
    subcommands:
      - connect: Connect to AIRI desktop app
      - disconnect: Disconnect from AIRI
      - status: Show connection status
      - say: Send a message to AIRI character
      - config: Show current configuration

dependencies:
  - @proj-airi/server-sdk
  - ws
  - superjson
