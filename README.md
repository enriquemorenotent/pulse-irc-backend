
# Web IRC Client – Backend

## Overview
Node.js gateway that maps browser WebSocket traffic to IRC. **This project is intended to be run locally by a single user (you) on your own computer. It is not designed for deployment, public access, or multi-user scenarios.**

One WebSocket connection may control multiple IRC sessions. Each client → server message must include a unique `id` so the backend knows which IRC connection it applies to. All server → client events include the same `id`.

Features related to authentication, production hardening, deployment, and multi-user support have been intentionally omitted or removed to keep the project simple for local use.

## Stack
- Node.js 20
- Express 5
- irc‑framework
- ws

## Quick start

### Local
```bash
git clone <repo‑url>
cd pulse-irc-backend
npm install
npm run dev
```

## Environment
```
PORT=3000
# IRC connection details are supplied by the frontend at runtime.
```

## Scripts
- `npm run dev` – dev with nodemon
- `npm start` – prod
- `npm test` – tests
- `npm run lint` – ESLint
- `npm run format` – Prettier

## API

### WebSocket
Endpoint: `/ws`

Example messages:
```json
{ "type": "connect", "id": "server1", "server": "irc.example.net", "nick": "myNick" }
{ "type": "join", "id": "server1", "channel": "#chat" }
{ "type": "message", "id": "server1", "channel": "#chat", "text": "Hello" }
```


<!--
### REST
`POST /auth/login` → `{ "token": "..." }`
-->

## License
MIT

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines including linting and formatting.
