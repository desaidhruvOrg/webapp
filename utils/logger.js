const winston = require("winston");
const WinstonCloudWatch = require("winston-cloudwatch");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const logLevels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
};

const logColors = {
	error: "red",
	warn: "yellow",
	info: "green",
	http: "magenta",
	debug: "white",
};

winston.addColors(logColors);

const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
	winston.format.colorize({ all: true }),
	winston.format.printf(
		(info) => `${info.timestamp} ${info.level}: ${info.message}`
	)
);

const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
	levels: logLevels,
	level: process.env.LOG_LEVEL || "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		new winston.transports.Console({
			format: consoleFormat,
		}),
		new winston.transports.File({
			filename: path.join(logDir, "application.log"),
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			),
		}),
	],
	exitOnError: false,
});

if (process.env.AWS_REGION && process.env.NODE_ENV === "production") {
	logger.add(
		new WinstonCloudWatch({
			logGroupName:
				process.env.CLOUDWATCH_LOG_GROUP_NAME || "csye6225-webapp-logs",
			logStreamName: `${
				process.env.CLOUDWATCH_LOG_STREAM_PREFIX || "app"
			}-${Date.now()}`,
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
	logger.info("CloudWatch logging enabled");
} else {
	logger.info("CloudWatch logging disabled - AWS credentials not available");
}

module.exports = logger;
