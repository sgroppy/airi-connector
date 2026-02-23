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
  airi-speak:
    description: Send text to AIRI for speech synthesis
    usage: airi-speak "Hello world" [emotion] [speed]
    examples:
      - airi-speak "Hello everyone"
      - airi-speak "Great job!" happy 1.2
      - airi-speak "Processing..." neutral 0.8
    script: ./bin/airi-speak.mjs
    args:
      - text: Message to speak (required)
      - emotion: Emotion style (happy, neutral, excited, calm)
      - speed: Speech speed multiplier (0.5 - 2.0)

dependencies:
  - @proj-airi/server-sdk
  - ws
  - superjson
