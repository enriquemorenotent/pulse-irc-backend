
# Web IRC Client – Backend

## Overview
Node.js gateway that maps browser WebSocket traffic to IRC. **This project is intended to be run locally by a single user (you) on your own computer. It is not designed for deployment, public access, or multi-user scenarios.**

Features related to authentication, production hardening, deployment, and multi-user support have been intentionally omitted or removed to keep the project simple for local use.

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


<!--
### Docker
```bash
docker compose up --build
```
-->

## Environment
```
PORT=3000
IRC_SERVER=irc.libera.chat
IRC_NICK=webbot
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


<!--
### REST
`POST /auth/login` → `{ "token": "..." }`
-->


<!--
## Deployment
Push the Docker image to any registry or deploy to Fly.io, Render, or a VPS.
-->

## License
MIT