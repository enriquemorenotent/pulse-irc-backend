# Backend TODO

- [x] Support per-user IRC connections (full IRC client mode) - [x] Update protocol: accept IRC connection details (server, nick, [optional] password/auth) from frontend via WebSocket message: `{ "type": "connect", "id": "...", "server": "...", "nick": "..." }`
  - [x] On new WebSocket connection, wait for "connect" message before creating IRC client
    - [x] After IRC handshake, send `{"type": "irc-ready", "id": "..."}` to frontend
  - [x] Accept channel join/part actions as separate messages: `{ "type": "join", "channel": "..." }`, `{ "type": "part", "channel": "..." }`
  - [x] Create and manage a separate IRC client instance for each WebSocket connection
  - [x] Route IRC events/messages back to the correct WebSocket client
  - [x] Clean up IRC client when WebSocket disconnects
  - [x] Handle errors and send error messages to the correct client
  - [x] Update documentation and protocol description
