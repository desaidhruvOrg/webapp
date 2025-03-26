const AWS = require('aws-sdk');
const { trackS3Operation } = require('./metrics');
const logger = require('./logger');

// Configure AWS SDK with region
AWS.config.update({
  region: process.env.AWS_REGION
});

// Create S3 service object
// In production, this will use the IAM role attached to the EC2 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

// Enhanced S3 operations with metrics tracking
const enhancedS3 = {
  upload: (params) => {
    logger.info(`Uploading file to S3: ${params.Key}`);
    return {
      promise: () => trackS3Operation(
        () => s3.upload(params).promise(),
        'upload'
      )
    };
  },
  
  deleteObject: (params) => {
    logger.info(`Deleting file from S3: ${params.Key}`);
    return {
      promise: () => trackS3Operation(
        () => s3.deleteObject(params).promise(),
        'delete'
      )
    };
  },
  
  getObject: (params) => {
    logger.info(`Getting file from S3: ${params.Key}`);
    return {
      promise: () => trackS3Operation(
        () => s3.getObject(params).promise(),
        'get'
      )
    };
  }
};

module.exports = enhancedS3;