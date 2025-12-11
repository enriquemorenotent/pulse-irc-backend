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

Requires Node.js 20 or later.

```bash
git clone <repo‑url>
cd pulse-irc-backend
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

Example contents:

```
PORT=38100
# IRC connection details are supplied by the frontend at runtime.
```

## Scripts

- `npm run dev` – dev with nodemon
- `npm start` – prod
- `npm test` – tests
- `npm run lint` – ESLint
- `npm run format` – Prettier

## Testing

Run all tests:

```bash
npm test
```

## API

### WebSocket

Endpoint: any path (example: `/ws`)

Example messages:

```json
{ "type": "connect", "id": "server1", "server": "irc.example.net", "nick": "myNick", "tls": true }
{ "type": "join", "id": "server1", "channel": "#chat" }
{ "type": "message", "id": "server1", "channel": "#chat", "text": "Hello" }
```
Use `"tls": true` to force a secure connection. If omitted, TLS is automatically
enabled for standard secure ports (6697, 7000, 7070) and servers ending with
`libera.chat`.

<!--
### REST
`POST /auth/login` → `{ "token": "..." }`
-->

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines including linting and formatting.
