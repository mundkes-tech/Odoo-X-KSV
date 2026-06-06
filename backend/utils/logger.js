function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;

  if (!meta) {
    return base;
  }

  return `${base} ${JSON.stringify(meta)}`;
}

const logger = {
  info(message, meta) {
    console.log(formatMessage('INFO', message, meta));
  },

  warn(message, meta) {
    console.warn(formatMessage('WARN', message, meta));
  },

  error(message, meta) {
    console.error(formatMessage('ERROR', message, meta));
  },

  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },
};

module.exports = logger;
