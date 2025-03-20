const AWS = require('aws-sdk');

// Configure AWS SDK with region
AWS.config.update({
  region: process.env.AWS_REGION
});

// Create S3 service object
// In production, this will use the IAM role attached to the EC2 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

module.exports = s3;