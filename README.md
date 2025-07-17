# Web IRC Client – Backend

## Overview
Node.js gateway that maps browser WebSocket traffic to IRC, handles JWT auth, and exposes optional REST endpoints.

## Stack
- Node.js 20
- Express 4
- irc‑framework
- ws
- jsonwebtoken
- PostgreSQL (optional)
- Redis (optional)

## Quick start

### Local
```bash
git clone <repo‑url>
cd web-irc-backend
npm install
cp .env.example .env
npm run dev
```

### Docker
```bash
docker compose up --build
```

## Environment
```
PORT=3000
IRC_SERVER=irc.libera.chat
IRC_NICK=webbot
JWT_SECRET=supersecret
PG_URL=postgres://user:pass@localhost:5432/ircdb
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=20
```

## Scripts
- `npm run dev` – dev with nodemon
- `npm start` – prod
- `npm test` – tests

## API

### WebSocket
Endpoint: `/ws`

Example messages:
```json
{ "type": "join", "channel": "#chat" }
{ "type": "message", "channel": "#chat", "text": "Hello" }
```

### REST
`POST /auth/login` → `{ "token": "..." }`

## Deployment
Push the Docker image to any registry or deploy to Fly.io, Render, or a VPS.

## License
MIT