# Backend TODO

Chronological checklist. Mark items with **x** when complete.

- [x] Init repo: `npm init -y`, .gitignore, LICENSE
- [x] Project tooling: ESLint, Prettier, nodemon, npm scripts
- [x] Basic scaffold: `src/index.js`, logger utility
- [x] Environment handling: `dotenv`, add `.env.example`
- [x] Express baseline: app, health‑check route, error handler
- [ ] WebSocket server: attach `ws`; echo test
- [ ] IRC bridge: integrate `irc-framework`, connect via env
- [ ] Message mapper: WebSocket ⇄ IRC (join, message, part)
- [ ] JWT auth: `/auth/login`, token sign/verify, WS upgrade guard
- [ ] Rate limiting: in‑memory or Redis store
- [ ] Channel state cache: Redis pub/sub fan‑out (optional)
- [ ] Persistence: PostgreSQL models for users & logs (optional)
- [ ] Tests: Jest & supertest for REST and WS flow
- [ ] Dockerfile & docker‑compose: Node, Postgres, Redis
- [ ] CI workflow: GitHub Actions (lint, test, build image)
- [ ] Production hardening: helmet, CORS, graceful shutdown, structured logs
- [ ] Observability: Prometheus metrics, readiness/liveness probes
- [ ] Release: tag version, push image, deploy to Fly.io/Render