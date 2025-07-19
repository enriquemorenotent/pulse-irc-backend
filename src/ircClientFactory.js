const IRC = require('irc-framework');
const logger = require('./logger');

/**
 * Create and connect an IRC client, wiring events to the given WebSocket.
 * @param {Object} options - IRC connection options
 * @param {string} options.server - IRC server hostname
 * @param {number} [options.port=6697] - IRC server port
 * @param {string} options.nick - IRC nickname
 * @param {string} [options.password] - optional server password
 * @param {boolean} [options.tls] - explicitly enable or disable TLS
 * @param {import('ws')} ws - WebSocket to relay IRC events to
 * @param {Object} entry - Map entry storing client state
 * @returns {IRC.Client}
 */
function createIrcClient(options, ws, entry, id, onDisconnect) {
  const { server: host, port = 6697, nick, password, tls } = options;
  const ircClient = new IRC.Client();
  entry.ircClient = ircClient;

  function cleanup(reason, notify = true) {
    if (entry.ircClient) {
      try {
        ircClient.removeAllListeners();
        ircClient.quit(reason || 'disconnect');
        if (ircClient.connection && ircClient.connection.end) {
          ircClient.connection.end();
        }
      } catch (err) {
        logger.error('Error during IRC cleanup:', err);
      }
      entry.ircClient = null;
      entry.ircReady = false;
      if (notify && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'disconnected', id }));
      }
      if (typeof onDisconnect === 'function') {
        onDisconnect();
      }
    }
  }

  const useTLS =
    typeof tls === 'boolean'
      ? tls
      : port === 6697 ||
        port === 7000 ||
        port === 7070 ||
        /libera\.chat$/.test(host);
  logger.info(
    `Connecting to IRC for ws: server=${host}, port=${port}, nick=${nick}, tls=${useTLS}`
  );

  ircClient.on('connecting', () => {
    logger.info('IRC client: connecting...');
  });

  ircClient.on('socket connected', () => {
    logger.info('IRC client: socket connected');
  });

  ircClient.on('registered', () => {
    entry.ircReady = true;
    ws.send(JSON.stringify({ type: 'irc-ready', id }));
    logger.info('Sent irc-ready to WebSocket client after IRC handshake');
  });

  ircClient.on('close', () => {
    logger.warn('IRC client: connection closed');
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'disconnected', id }));
    }
    cleanup('close', false);
  });

  ircClient.on('socket close', () => {
    logger.warn('IRC client: socket closed');
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'disconnected', id }));
    }
    cleanup('socket close', false);
  });

  ircClient.on('quit', (event) => {
    logger.warn('IRC client: quit', event);
  });

  ircClient.on('error', (err) => {
    logger.error('IRC error:', err);
    ws.send(
      JSON.stringify({ type: 'error', id, error: 'IRC connection failed', details: err && err.message })
    );
    cleanup('error', false);
  });

  ircClient.on('nick in use', (event) => {
    logger.warn('IRC nick in use:', event);
    const newNick = `${event.nick}${Math.floor(1000 + Math.random() * 9000)}`;
    logger.info(`Trying new IRC nick: ${newNick}`);
    ws.send(JSON.stringify({ type: 'nick', id, nick: newNick }));
    ircClient.changeNick(newNick);
  });

  ircClient.on('registration failed', (event) => {
    logger.error('IRC registration failed:', event);
  });

  ircClient.on('message', (event) => {
    ws.send(
      JSON.stringify({ type: 'message', id, from: event.nick, channel: event.target, text: event.message })
    );
  });

  ircClient.on('motd', (event) => {
    ws.send(JSON.stringify({ type: 'server-message', id, subtype: 'motd', text: event.motd }));
  });

  ircClient.on('topic', (event) => {
    ws.send(
      JSON.stringify({ type: 'topic', id, channel: event.channel, topic: event.topic, nick: event.nick })
    );
  });

  ircClient.on('notice', (event) => {
    if (!event.target || event.target === ircClient.user.nick) {
      ws.send(
        JSON.stringify({ type: 'server-message', id, subtype: 'notice', from: event.nick, text: event.message })
      );
    }
  });

  ircClient.on('raw', (event) => {
    logger.info('IRC RAW:', event);

    if (event && event.command) {
      const serverNumerics = ['001', '002', '003', '004', '005', '372', '375', '376'];
      if (serverNumerics.includes(event.command)) {
        ws.send(
          JSON.stringify({
            type: 'server-message',
            id,
            subtype: event.command,
            text: event.params && event.params.join(' '),
          })
        );
      }
    }

    if (event && event.line) {
      const match = event.line.match(/\s353\s+\S+\s+[@=*]\s+(#\S+)\s+:([\S ]+)/);
      if (match) {
        const channel = match[1];
        const nicks = match[2].split(' ').map((n) => n.replace(/^[@+]/, ''));
        ws.send(JSON.stringify({ type: 'names', id, channel, nicks }));
      }
    }
  });

  ircClient.on('join', (event) => {
    ws.send(JSON.stringify({ type: 'join', id, nick: event.nick, channel: event.channel }));
  });

  ircClient.on('part', (event) => {
    ws.send(JSON.stringify({ type: 'part', id, nick: event.nick, channel: event.channel }));
  });

  ircClient.on('names', (event) => {
    const nicks = event && event.users ? Object.keys(event.users) : [];
    ws.send(JSON.stringify({ type: 'names', id, channel: event.channel, nicks }));
  });

  ircClient.connect({ host, port, nick, password, tls: useTLS, auto_reconnect: false });

  // expose disconnect helper for manual cleanup
  ircClient.disconnect = cleanup;

  return ircClient;
}

module.exports = createIrcClient;
