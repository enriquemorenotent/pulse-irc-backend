# Backend TODO

- [ ] Support per-user IRC connections (full IRC client mode)
	- [ ] Update protocol: accept IRC connection details (server, nick, [optional] password/auth) from frontend via WebSocket message: `{ "type": "connect", "server": "...", "nick": "..." }`
	- [ ] On new WebSocket connection, wait for "connect" message before creating IRC client
	- [ ] After IRC handshake, send `{"type": "irc-ready"}` to frontend
	- [ ] Accept channel join/part actions as separate messages: `{ "type": "join", "channel": "..." }`, `{ "type": "part", "channel": "..." }`
	- [ ] Create and manage a separate IRC client instance for each WebSocket connection
	- [ ] Route IRC events/messages back to the correct WebSocket client
	- [ ] Clean up IRC client when WebSocket disconnects
	- [ ] Handle errors and send error messages to the correct client
	- [ ] Update documentation and protocol description
	- [ ] Test with multiple clients, servers, and nicks
