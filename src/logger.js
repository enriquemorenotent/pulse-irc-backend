const levels = ['error', 'warn', 'info', 'debug'];

function log(level, ...args) {
  const timestamp = new Date().toISOString();
  if (levels.includes(level)) {
    console[level === 'debug' ? 'log' : level](
      `[${timestamp}] [${level.toUpperCase()}]`,
      ...args
    );
  } else {
    console.log(`[${timestamp}] [LOG]`, ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};
