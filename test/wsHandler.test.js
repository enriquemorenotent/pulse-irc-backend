const http = require('http');
const WebSocket = require('ws');
const { once } = require('events');
const app = require('../src/app');
const setupWebSocketServer = require('../src/wsHandler');

// Mock the IRC client factory to avoid real network connections
jest.mock('../src/ircClientFactory', () => {
  return jest.fn((options, ws, entry, id) => {
    // simple stub client with no real IRC connection
    const client = {
      join: jest.fn(),
      say: jest.fn(),
      part: jest.fn(),
      raw: jest.fn(),
      disconnect: jest.fn(),
    };
    entry.ircClient = client;
    // simulate immediate IRC ready
    process.nextTick(() => {
      entry.ircReady = true;
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'irc-ready', id }));
      }
    });
    return client;
  });
});

describe('WebSocket IRC bridge', () => {
  let server;
  let wss;
  let port;

  beforeEach(async () => {
    server = http.createServer(app);
    wss = setupWebSocketServer(server);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
  });

  afterEach(async () => {
    await new Promise((resolve) => wss.close(() => server.close(resolve)));
  });

  test('connect handshake yields irc-ready', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await once(ws, 'open');

    ws.send(
      JSON.stringify({
        type: 'connect',
        id: 'session1',
        server: 'irc.test',
        nick: 'alice',
      })
    );

    const [data] = await once(ws, 'message');
    expect(JSON.parse(data)).toEqual({ type: 'irc-ready', id: 'session1' });

    ws.close();
    await once(ws, 'close');
  });

  test('sending command before connect results in error', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await once(ws, 'open');

    ws.send(
      JSON.stringify({ type: 'join', id: 'bad', channel: '#chan' })
    );

    const [data] = await once(ws, 'message');
    expect(JSON.parse(data)).toEqual({ type: 'error', error: 'IRC not connected' });

    ws.close();
    await once(ws, 'close');
  });

  test('unknown message type returns error', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await once(ws, 'open');

    ws.send(
      JSON.stringify({
        type: 'connect',
        id: 'foo',
        server: 'irc.test',
        nick: 'bob',
      })
    );
    await once(ws, 'message'); // irc-ready

    ws.send(JSON.stringify({ type: 'bogus', id: 'foo' }));
    const [data] = await once(ws, 'message');
    expect(JSON.parse(data)).toEqual({ type: 'error', error: 'Unknown message type' });

    ws.close();
    await once(ws, 'close');
  });
});
