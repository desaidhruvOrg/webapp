const StatsD = require('statsd-client');
const logger = require('./logger');
require('dotenv').config();

// Initialize StatsD client
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || 8125,
  prefix: 'webapp.',
});

// Middleware to track API metrics
const trackApiMetrics = (req, res, next) => {
  const startTime = Date.now();
  const path = req.path.replace(/\/:[^/]+/g, '/:param'); // Normalize path params
  const method = req.method.toLowerCase();
  const metricKey = `api.${method}.${path.replace(/\//g, '.')}`;

  // Increment counter for API call
  statsd.increment(`${metricKey}.count`);

  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    statsd.timing(`${metricKey}.time`, duration);
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// Function to track database query time
const trackDbQuery = async (queryFunc, queryName) => {
  const startTime = Date.now();
  try {
    const result = await queryFunc();
    const duration = Date.now() - startTime;
    statsd.timing(`db.${queryName}.time`, duration);
    logger.debug(`DB Query ${queryName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    statsd.timing(`db.${queryName}.time`, duration);
    logger.error(`DB Query ${queryName} failed after ${duration}ms: ${error.message}`);
    throw error;
  }
};

// Function to track S3 operations
const trackS3Operation = async (s3Func, operationName) => {
  const startTime = Date.now();
  try {
    const result = await s3Func();
    const duration = Date.now() - startTime;
    statsd.timing(`s3.${operationName}.time`, duration);
    logger.debug(`S3 Operation ${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    statsd.timing(`s3.${operationName}.time`, duration);
    logger.error(`S3 Operation ${operationName} failed after ${duration}ms: ${error.message}`);
    throw error;
  }
};

module.exports = {
  statsd,
  trackApiMetrics,
  trackDbQuery,
  trackS3Operation,
};