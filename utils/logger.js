const winston = require("winston");
const WinstonCloudWatch = require("winston-cloudwatch");
require("dotenv").config();

// Enhanced log levels with more granularity
const logLevels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
	trace: 5,
};

// Define log colors for better console visibility
const logColors = {
	error: "red",
	warn: "yellow",
	info: "green",
	http: "magenta",
	debug: "blue",
	trace: "white",
};

winston.addColors(logColors);

// Enhanced console format with more details
const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
	winston.format.colorize({ all: true }),
	winston.format.printf((info) => {
		const { timestamp, level, message, ...meta } = info;
		return `${timestamp} ${level}: ${message} ${
			Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
		}`;
	})
);

// Enhanced JSON format for structured logging
const jsonFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.errors({ stack: true }), // Include stack traces
	winston.format.json()
);

// Create the logger instance with enhanced configuration
const logger = winston.createLogger({
	levels: logLevels,
	level: process.env.LOG_LEVEL || "info",
	format: jsonFormat,
	defaultMeta: {
		environment: process.env.NODE_ENV,
		service: process.env.SERVICE_NAME || "webapp",
	},
	transports: [
		new winston.transports.Console({
			format: consoleFormat,
		}),
		new winston.transports.File({
			filename: process.env.LOG_FILE_PATH || "/var/log/webapp.log",
			format: jsonFormat,
		}),
	],
	exitOnError: false,
});

// Enhanced CloudWatch configuration
if (process.env.AWS_REGION && process.env.NODE_ENV === "production") {
	const cloudWatchConfig = {
		logGroupName:
			process.env.CLOUDWATCH_LOG_GROUP_NAME || "csye6225-webapp-logs",
		logStreamName: `${
			process.env.CLOUDWATCH_LOG_STREAM_PREFIX || "app"
		}-${Date.now()}`,
		awsRegion: process.env.AWS_REGION,
		retentionInDays: parseInt(process.env.LOG_RETENTION_DAYS || "7"),
		messageFormatter: ({ level, message, timestamp, ...meta }) => {
			return JSON.stringify({
				level,
				message,
				timestamp: timestamp || new Date().toISOString(),
				environment: process.env.NODE_ENV,
				service: process.env.SERVICE_NAME,
				...meta,
			});
		},
	};

	logger.add(new WinstonCloudWatch(cloudWatchConfig));
	logger.info("CloudWatch logging enabled", { config: cloudWatchConfig });
} else {
	logger.info("CloudWatch logging disabled - AWS credentials not available");
}

module.exports = logger;
