const StatsD = require("statsd-client");
const logger = require("./logger");
require("dotenv").config();

const statsd = new StatsD({
	host: process.env.STATSD_HOST || "localhost",
	port: process.env.STATSD_PORT || 8125,
	prefix: process.env.STATSD_PREFIX || "WebApp.",
});

// Middleware to track API metrics
const trackApiMetrics = (req, res, next) => {
	const startTime = Date.now();
	const path = req.path.replace(/\/:[^/]+/g, "/:param");
	const method = req.method.toLowerCase();

	// Use the format expected by the dashboard
	const apiName = `${req.method} ${path}`;

	// Increment counter for API call with the correct metric name
	statsd.increment("api.calls.count", 1, { ApiName: apiName });

	// Track response time
	res.on("finish", () => {
		const duration = Date.now() - startTime;
		statsd.timing("api.response.time", duration, { ApiName: apiName });
		logger.http(
			`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
		);
	});

	next();
};

// Enhanced database query tracking with detailed metrics
const trackDbQuery = async (queryFunc, queryName, tableName) => {
	const startTime = Date.now();
	const tags = {
		QueryType: queryName,
		Table: tableName,
	};

	try {
		const result = await queryFunc();
		const duration = Date.now() - startTime;

		// Track multiple metrics for better visibility
		statsd.timing("db.query.time", duration, tags);
		statsd.increment("db.query.count", 1, tags);
		statsd.gauge("db.query.last_duration", duration, tags);

		if (duration > 1000) {
			// Slow query threshold
			statsd.increment("db.query.slow", 1, tags);
		}

		logger.debug("DB Query completed", {
			type: "DB_QUERY",
			queryName,
			tableName,
			duration,
			success: true,
		});

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		statsd.timing("db.query.time", duration, tags);
		statsd.increment("db.query.error", 1, tags);

		logger.error("DB Query failed", {
			type: "DB_QUERY_ERROR",
			queryName,
			tableName,
			duration,
			error: error.message,
			stack: error.stack,
		});

		throw error;
	}
};

// Enhanced S3 operation tracking
const trackS3Operation = async (
	operationFunc,
	operationType,
	bucketName,
	key
) => {
	const startTime = Date.now();
	const tags = {
		Operation: operationType,
		Bucket: bucketName,
	};

	try {
		const result = await operationFunc();
		const duration = Date.now() - startTime;

		// Track multiple metrics for S3 operations
		statsd.timing("s3.operation.time", duration, tags);
		statsd.increment("s3.operation.count", 1, tags);
		statsd.gauge("s3.operation.last_duration", duration, tags);

		if (duration > 2000) {
			// Slow S3 operation threshold
			statsd.increment("s3.operation.slow", 1, tags);
		}

		logger.debug("S3 operation completed", {
			type: "S3_OPERATION",
			operationType,
			bucketName,
			key,
			duration,
			success: true,
		});

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		statsd.timing("s3.operation.time", duration, tags);
		statsd.increment("s3.operation.error", 1, tags);

		logger.error("S3 operation failed", {
			type: "S3_OPERATION_ERROR",
			operationType,
			bucketName,
			key,
			duration,
			error: error.message,
			stack: error.stack,
		});

		throw error;
	}
};

module.exports = {
	statsd,
	trackApiMetrics,
	trackDbQuery,
	trackS3Operation,
};
