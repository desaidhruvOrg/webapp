const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
require('dotenv').config();

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Configure Winston format
winston.addColors(logColors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Add file transport to write to /var/log/webapp.log
    new winston.transports.File({
      filename: '/var/log/webapp.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  exitOnError: false,
});

// Add CloudWatch transport if AWS credentials are available
if (process.env.AWS_REGION && process.env.NODE_ENV === 'production') {
  logger.add(
    new WinstonCloudWatch({
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME || 'csye6225-webapp-logs',
      // Fix the log stream name format to use only allowed characters
      logStreamName: `${process.env.CLOUDWATCH_LOG_STREAM_PREFIX || 'app'}-${Date.now()}`,
      awsRegion: process.env.AWS_REGION,
      messageFormatter: ({ level, message, ...meta }) => {
        return JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          ...meta,
        });
      },
    })
  );
  logger.info('CloudWatch logging enabled');
} else {
  logger.info('CloudWatch logging disabled - AWS credentials not available');
}

module.exports = logger;