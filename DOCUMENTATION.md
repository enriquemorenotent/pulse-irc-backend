
# Backend API Documentation

This document describes how to interact with the backend WebSocket IRC bridge for frontend integration. The backend supports multiple independent IRC sessions—one per WebSocket connection—allowing each frontend user to connect to any IRC server with their own nickname.


## Protocol Overview and Connection Flow

1. **Connect to WebSocket:**
   - The frontend opens a WebSocket connection to the backend: `ws://<backend-host>:<port>` (default port: 3000).
2. **Send IRC Connect Message:**
   - The frontend must send a message of the form:
     ```json
     { "type": "connect", "server": "irc.example.net", "nick": "myNick" }
     ```
     - `server`: IRC server hostname (required)
     - `nick`: IRC nickname (required)
     - `password`: (optional) Password for servers that require authentication
   - No other IRC actions are allowed until the backend responds with `{"type": "irc-ready"}`.
3. **Wait for IRC Ready:**
   - The backend connects to the IRC server and performs the handshake.
   - If the requested nickname is already in use, the backend will automatically try a new nickname by appending random digits, and will notify the frontend of the new nickname with a message:
     ```json
     { "type": "nick", "nick": "<newNick>" }
     ```
   - Once the IRC connection is fully established, the backend sends:
     ```json
     { "type": "irc-ready" }
     ```
   - The frontend must wait for this message before sending any channel join or IRC actions.
4. **IRC Actions:**
   - After receiving `irc-ready`, the frontend can send:
     - Join a channel:
       ```json
       { "type": "join", "channel": "#channel" }
       ```
     - Send a message:
       ```json
       { "type": "message", "channel": "#channel", "text": "Hello world" }
       ```
     - Part (leave) a channel:
       ```json
       { "type": "part", "channel": "#channel" }
       ```
     - Request nick list:
       ```json
       { "type": "names", "channel": "#channel" }
       ```
   - The backend will relay IRC events and responses as described below.

## Example Session

1. **Frontend connects to backend WebSocket**
2. **Frontend sends:**
   ```json
   { "type": "connect", "server": "irc.libera.chat", "nick": "alice" }
   ```
3. **Backend responds (after IRC handshake):**
   ```json
   { "type": "irc-ready" }
   ```
4. **Frontend sends:**
   ```json
   { "type": "join", "channel": "#test" }
   ```
5. **Backend responds:**
   ```json
   { "type": "join", "nick": "alice", "channel": "#test" }
   ```
6. **Frontend sends:**
   ```json
   { "type": "message", "channel": "#test", "text": "Hello IRC!" }
   ```
7. **Backend relays messages and events as they occur.**

## Error Handling

- If the frontend sends any IRC action before `irc-ready`, the backend responds with:
  ```json
  { "type": "error", "error": "IRC not connected" }
  ```
- If the IRC connection fails, the backend responds with:
  ```json
  { "type": "error", "error": "IRC connection failed" }
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
  { "type": "connect", "server": "irc.example.net", "nick": "myNick" }
  ```
  (Optionally, add `"password": "..."` for servers that require authentication.)
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
  Sent once after the backend IRC client for this WebSocket is fully connected and ready to accept channel join requests. The frontend should wait for this message before enabling IRC actions.
- **IRC nickname changed by backend**
  ```json
  { "type": "nick", "nick": "<newNick>" }
  ```
  Sent if the backend changes the IRC nickname due to a collision (e.g., the requested nick is already in use). The frontend should update its state to reflect the new nickname.
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

IRC connection details are now provided by the frontend per WebSocket connection. The backend no longer uses `IRC_SERVER`, `IRC_NICK`, or `IRC_CHANNEL` environment variables.

## Notes
- No authentication is required.
- The backend is intended for local, single-user use.
- The frontend should handle connection errors and display error messages from the backend.

---

For any changes to the backend protocol, update this documentation and notify the frontend maintainers.
