const IRC = require('irc-framework');
const logger = require('./logger');

/**
 * Create and connect an IRC client, wiring events to the given WebSocket.
 * @param {Object} options - IRC connection options
 * @param {import('ws')} ws - WebSocket to relay IRC events to
 * @param {Object} entry - Map entry storing client state
 * @returns {IRC.Client}
 */
function createIrcClient(options, ws, entry) {
  const { server: host, port = 6697, nick, password } = options;
  const ircClient = new IRC.Client();
  entry.ircClient = ircClient;

  const useTLS =
    port === 6697 || port === 7000 || port === 7070 || /libera\.chat$/.test(host);
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
    ws.send(JSON.stringify({ type: 'irc-ready' }));
    logger.info('Sent irc-ready to WebSocket client after IRC handshake');
  });

  ircClient.on('close', () => {
    logger.warn('IRC client: connection closed');
  });

  ircClient.on('quit', (event) => {
    logger.warn('IRC client: quit', event);
  });

  ircClient.on('error', (err) => {
    logger.error('IRC error:', err);
    ws.send(
      JSON.stringify({ type: 'error', error: 'IRC connection failed', details: err && err.message })
    );
  });

  ircClient.on('nick in use', (event) => {
    logger.warn('IRC nick in use:', event);
    const newNick = `${event.nick}${Math.floor(1000 + Math.random() * 9000)}`;
    logger.info(`Trying new IRC nick: ${newNick}`);
    ws.send(JSON.stringify({ type: 'nick', nick: newNick }));
    ircClient.changeNick(newNick);
  });

  ircClient.on('registration failed', (event) => {
    logger.error('IRC registration failed:', event);
  });

  ircClient.on('message', (event) => {
    ws.send(
      JSON.stringify({ type: 'message', from: event.nick, channel: event.target, text: event.message })
    );
  });

  ircClient.on('motd', (event) => {
    ws.send(JSON.stringify({ type: 'server-message', subtype: 'motd', text: event.motd }));
  });

  ircClient.on('topic', (event) => {
    ws.send(
      JSON.stringify({ type: 'topic', channel: event.channel, topic: event.topic, nick: event.nick })
    );
  });

  ircClient.on('notice', (event) => {
    if (!event.target || event.target === ircClient.user.nick) {
      ws.send(
        JSON.stringify({ type: 'server-message', subtype: 'notice', from: event.nick, text: event.message })
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
        ws.send(JSON.stringify({ type: 'names', channel, nicks }));
      }
    }
  });

  ircClient.on('join', (event) => {
    ws.send(JSON.stringify({ type: 'join', nick: event.nick, channel: event.channel }));
  });

  ircClient.on('part', (event) => {
    ws.send(JSON.stringify({ type: 'part', nick: event.nick, channel: event.channel }));
  });

  ircClient.on('names', (event) => {
    const nicks = event && event.users ? Object.keys(event.users) : [];
    ws.send(JSON.stringify({ type: 'names', channel: event.channel, nicks }));
  });

  ircClient.connect({ host, port, nick, password, tls: useTLS, auto_reconnect: false });

  return ircClient;
}

module.exports = createIrcClient;
