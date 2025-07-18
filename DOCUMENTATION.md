
# Backend API Documentation

This document describes how to interact with the backend WebSocket IRC bridge for frontend integration. The backend now supports multiple independent IRC sessions over a single WebSocket connection. Each session is identified by a unique `id` supplied by the frontend.


## Protocol Overview and Connection Flow

1. **Connect to WebSocket:**
   - The frontend opens a WebSocket connection to the backend: `ws://<backend-host>:<port>` (default port: 3000).
2. **Send IRC Connect Message:**
   - The frontend must send a message of the form:
     ```json
     { "type": "connect", "id": "server1", "server": "irc.example.net", "nick": "myNick" }
     ```
     - `server`: IRC server hostname (required)
     - `nick`: IRC nickname (required)
     - `password`: (optional) Password for servers that require authentication
   - No other IRC actions are allowed until the backend responds with `{"type": "irc-ready", "id": "<same id>"}`.
3. **Wait for IRC Ready:**
   - The backend connects to the IRC server and performs the handshake.
   - If the requested nickname is already in use, the backend will automatically try a new nickname by appending random digits, and will notify the frontend of the new nickname with a message:
     ```json
     { "type": "nick", "nick": "<newNick>" }
     ```
   - Once the IRC connection is fully established, the backend sends:
     ```json
     { "type": "irc-ready", "id": "<id>" }
     ```
   - The frontend must wait for this message before sending any channel join or IRC actions.
4. **IRC Actions:**
   - After receiving `irc-ready`, the frontend can send:
    - Join a channel:
      ```json
      { "type": "join", "id": "<id>", "channel": "#channel" }
      ```
     - Send a message:
      ```json
      { "type": "message", "id": "<id>", "channel": "#channel", "text": "Hello world" }
      ```
     - Part (leave) a channel:
      ```json
      { "type": "part", "id": "<id>", "channel": "#channel" }
      ```
     - Request nick list:
      ```json
      { "type": "names", "id": "<id>", "channel": "#channel" }
      ```
   - The backend will relay IRC events and responses as described below.

## Example Session

1. **Frontend connects to backend WebSocket**
2. **Frontend sends:**
   ```json
   { "type": "connect", "id": "libera", "server": "irc.libera.chat", "nick": "alice" }
   ```
3. **Backend responds (after IRC handshake):**
   ```json
   { "type": "irc-ready", "id": "libera" }
   ```
4. **Frontend sends:**
   ```json
   { "type": "join", "id": "libera", "channel": "#test" }
   ```
5. **Backend responds:**
   ```json
   { "type": "join", "id": "libera", "nick": "alice", "channel": "#test" }
   ```
6. **Frontend sends:**
   ```json
   { "type": "message", "id": "libera", "channel": "#test", "text": "Hello IRC!" }
   ```
7. **Backend relays messages and events as they occur.**

## Error Handling

- If the frontend sends any IRC action before `irc-ready`, the backend responds with:
  ```json
  { "type": "error", "id": "<id>", "error": "IRC not connected" }
  ```
- If the IRC connection fails, the backend responds with:
  ```json
  { "type": "error", "id": "<id>", "error": "IRC connection failed" }
  ```
- If the frontend sends an unknown or malformed message, the backend responds with:
  ```json
  { "type": "error", "error": "Invalid JSON format" }
  ```
  or
  ```json
  { "type": "error", "error": "Unknown message type" }
  ```

## WebSocket API

- **Endpoint:** `ws://<backend-host>:<port>` (default port: 3000)
- **Protocol:** JSON messages

## WebSocket API

- **Endpoint:** `ws://<backend-host>:<port>` (default port: 3000)
- **Protocol:** JSON messages




### Message Types (Client → Server)

- **Connect to IRC server**
  ```json
  { "type": "connect", "id": "example", "server": "irc.example.net", "nick": "myNick" }
  ```
  (Optionally, add `"password": "..."` for servers that require authentication.)
- **Join a channel**
  ```json
  { "type": "join", "id": "example", "channel": "#channel" }
  ```
- **Send a message to a channel**
  ```json
  { "type": "message", "id": "example", "channel": "#channel", "text": "Hello world" }
  ```
- **Part (leave) a channel**
  ```json
  { "type": "part", "id": "example", "channel": "#channel" }
  ```
- **Request nick list for a channel**
  ```json
  { "type": "names", "id": "example", "channel": "#channel" }
  ```






### Message Types (Server → Client)

- **IRC connection ready**
  ```json
  { "type": "irc-ready", "id": "<id>" }
  ```
  Sent once after the backend IRC client for this WebSocket is fully connected and ready to accept channel join requests. The frontend should wait for this message before enabling IRC actions.
- **IRC nickname changed by backend**
  ```json
  { "type": "nick", "id": "<id>", "nick": "<newNick>" }
  ```
  Sent if the backend changes the IRC nickname due to a collision (e.g., the requested nick is already in use). The frontend should update its state to reflect the new nickname.


**IRC message received**
  ```json
  { "type": "message", "id": "<id>", "from": "nick", "channel": "#channel", "text": "Hello" }
  ```

**Channel topic received**
  ```json
  { "type": "topic", "id": "<id>", "channel": "#channel", "topic": "...", "nick": "nick" }
  ```
  - `channel`: The channel name for which the topic applies.
  - `topic`: The topic string as sent by the IRC server.
  - `nick`: The nick of the user who set the topic (if available).

**Server-level message (MOTD, notices, numerics, etc.)**
  ```json
  { "type": "server-message", "id": "<id>", "subtype": "motd|notice|001|002|...", "text": "..." }
  ```
  - `subtype`: Indicates the kind of server message (e.g., `motd` for Message of the Day, `notice` for server notices, or IRC numeric codes like `001`, `372`, etc.)
  - `text`: The message content as sent by the IRC server.

**User joined a channel**
  ```json
  { "type": "join", "id": "<id>", "nick": "nick", "channel": "#channel" }
  ```
**User parted a channel**
  ```json
  { "type": "part", "id": "<id>", "nick": "nick", "channel": "#channel" }
  ```
**Nick list for a channel**
  ```json
  { "type": "names", "id": "<id>", "channel": "#channel", "nicks": ["nick1", "nick2", "nick3"] }
  ```
**Error**
  ```json
  { "type": "error", "id": "<id>", "error": "Error message" }
  ```

## Health Check

- **Endpoint:** `GET /health`
- **Response:**
  ```json
  { "status": "ok" }
  ```



## Environment Variables (Backend)

- `PORT` - Port to run the backend server (default: 3000)

IRC connection details are now provided by the frontend per WebSocket connection. The backend no longer uses `IRC_SERVER`, `IRC_NICK`, or `IRC_CHANNEL` environment variables.

## Notes

- No authentication is required.
- The backend is intended for local, single-user use.
- The frontend should handle connection errors and display error messages from the backend.
- The backend now forwards all server-level messages (MOTD, server notices, numerics, etc.) to the frontend in real time using the `server-message` type. The frontend is responsible for displaying or storing these as needed.

---

For any changes to the backend protocol, update this documentation and notify the frontend maintainers.
