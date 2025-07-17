const levels = ['error', 'warn', 'info', 'debug'];

function log(level, ...args) {
  if (levels.includes(level)) {
    console[level === 'debug' ? 'log' : level](
      `[${level.toUpperCase()}]`,
      ...args
    );
  } else {
    console.log('[LOG]', ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};
