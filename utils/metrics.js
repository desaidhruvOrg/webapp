const StatsD = require('statsd-client');
const logger = require('./logger');
require('dotenv').config();

// Initialize StatsD client
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || 8125,
  prefix: 'CSYE6225/WebApp.',
});

// Middleware to track API metrics
const trackApiMetrics = (req, res, next) => {
  const startTime = Date.now();
  const path = req.path.replace(/\/:[^/]+/g, '/:param');
  const method = req.method.toLowerCase();
  
  // Use the format expected by the dashboard
  const apiName = `${req.method} ${path}`;
  
  // Increment counter for API call with the correct metric name
  statsd.increment('api.calls.count', 1, { ApiName: apiName });

  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    statsd.timing('api.response.time', duration, { ApiName: apiName });
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
    statsd.timing('db.query.time', duration, { QueryType: queryName });
    logger.debug(`DB Query ${queryName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    statsd.timing('db.query.time', duration, { QueryType: queryName });
    logger.error(`DB Query ${queryName} failed in ${duration}ms: ${error.message}`);
    throw error;
  }
};

// Function to track S3 operations
const trackS3Operation = async (operationFunc, operationType) => {
  const startTime = Date.now();
  try {
    const result = await operationFunc();
    const duration = Date.now() - startTime;
    statsd.timing('s3.operation.time', duration, { Operation: operationType });
    logger.debug(`S3 operation ${operationType} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    statsd.timing('s3.operation.time', duration, { Operation: operationType });
    logger.error(`S3 operation ${operationType} failed in ${duration}ms: ${error.message}`);
    throw error;
  }
};

module.exports = {
  statsd,  // Export the statsd client
  trackApiMetrics,
  trackDbQuery,
  trackS3Operation
};