# Backend API Documentation

This document describes how to interact with the backend WebSocket IRC bridge for frontend integration.

## WebSocket API

- **Endpoint:** `ws://<backend-host>:<port>` (default port: 3000)
- **Protocol:** JSON messages


### Message Types (Client → Server)

- **Join a channel**
  ```json
  { "type": "join", "channel": "#channel" }
  ```
- **Send a message to a channel**
  ```json
  { "type": "message", "channel": "#channel", "text": "Hello world" }
  ```
- **Part (leave) a channel**
  ```json
  { "type": "part", "channel": "#channel" }
  ```
- **Request nick list for a channel**
  ```json
  { "type": "names", "channel": "#channel" }
  ```



### Message Types (Server → Client)

- **IRC connection ready**
  ```json
  { "type": "irc-ready" }
  ```
  Sent once after the backend IRC client is fully connected and ready to accept channel join requests. The frontend should wait for this message before enabling IRC actions.

- **IRC message received**
  ```json
  { "type": "message", "from": "nick", "channel": "#channel", "text": "Hello" }
  ```
- **User joined a channel**
  ```json
  { "type": "join", "nick": "nick", "channel": "#channel" }
  ```
- **User parted a channel**
  ```json
  { "type": "part", "nick": "nick", "channel": "#channel" }
  ```
- **Nick list for a channel**
  ```json
  { "type": "names", "channel": "#channel", "nicks": ["nick1", "nick2", "nick3"] }
  ```
- **Error**
  ```json
  { "type": "error", "error": "Error message" }
  ```

## Health Check

- **Endpoint:** `GET /health`
- **Response:**
  ```json
  { "status": "ok" }
  ```

## Environment Variables (Backend)

- `PORT` - Port to run the backend server (default: 3000)
- `IRC_SERVER` - IRC server hostname (e.g., irc.libera.chat)
- `IRC_NICK` - Nickname for the IRC bot
- `IRC_CHANNEL` - (Optional) Channel to auto-join on connect

## Notes
- No authentication is required.
- The backend is intended for local, single-user use.
- The frontend should handle connection errors and display error messages from the backend.

---

For any changes to the backend protocol, update this documentation and notify the frontend maintainers.
