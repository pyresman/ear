# EARBOMB - Self-Destructing Audio Messages

## Overview
A web app that lets users record and share self-destructing audio messages. Recipients get a unique code/link to play the message once (or until a time limit), after which it is permanently deleted.

## Architecture

### Server
- **server.js** — Express.js server (Node.js) that:
  - Serves static frontend files from `/public/`
  - Provides REST API at `/api/*`
  - Stores messages in memory (Map) with automatic cleanup
  - Listens on port 5000, bound to `0.0.0.0`

### Frontend
- **public/index.html** — Single-page app with Record and Receive tabs
- **public/config.js** — Sets `window.API_BASE_URL = ''` (same-origin, relative API calls)
- **public/admin.html** — Admin panel for managing messages/config

### API Endpoints
- `GET /api/config` — Returns frontend configuration (banners, theme, etc.)
- `POST /api/create` — Create a new audio message, returns code + link
- `GET /api/message/:code` — Check if a message exists and get metadata
- `POST /api/message/:code/play` — Retrieve and play the audio (may destroy on access)

### Key Features
- Audio encryption (AES-GCM) when sent to server
- Self-destruction modes: on play, on time expiry, or both
- Optional password protection
- QR code generation for sharing
- Multiple share targets (WhatsApp, Telegram, Email, etc.)

## Running
```
node server.js
```
Server starts on port 5000.

## Notes
- The original project was built for Cloudflare Workers (src/index.js with Hono + D1 DB). That code is kept for reference but is not used on Replit.
- On Replit, the Express server handles everything with in-memory storage. Messages do not persist across server restarts.
- `wrangler.toml`, `vercel.json`, `netlify.toml` are deployment configs for other platforms and are not used here.
