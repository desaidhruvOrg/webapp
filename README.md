# Cloud Native Web Application

## Overview

This project implements a modern web application deployment across AWS. The application is built with Node.js and Express, featuring a health check endpoint and MySQL database integration. When developers push code, GitHub Actions automatically run tests and build custom AMIs using Packer. These AMIs contain everything needed to run the application, including system configurations and dependencies.

## Key Features

### Health Check Endpoint

-   Endpoint: `/healthz`
-   Methods: GET
-   Responses:
    -   `200`: Application and database are healthy
    -   `400`: Invalid request (query parameters or content present)
    -   `405`: Method not allowed
    -   `503`: Database connection failure
-   Headers:
    -   `Cache-Control: no-cache, no-store, must-revalidate`
    -   `Pragma: no-cache`
    -   `X-Content-Type-Options: nosniff`

### CI/CD Pipeline

-   Automated testing with GitHub Actions and MySQL integration
-   Packer-based AMI building for AWS
-   Cross-account AMI sharing between dev and demo environments
-   Automated instance refresh for zero-downtime deployments

### Security

-   Dedicated application user (csye6225) with appropriate permissions
-   No-cache headers and sniff prevention
-   MySQL security hardening
-   KMS encryption for sensitive data
-   Encrypted EBS volumes using custom KMS keys

### Monitoring

-   CloudWatch integration with custom metrics
-   Winston logging
-   StatsD metrics collection
-   Auto-scaling based on CPU utilization
-   Health check endpoint for uptime monitoring

## Infrastructure Components

-   Load Balancer with SSL/TLS termination
-   Auto Scaling Group (3-5 instances)
-   RDS MySQL database with encryption
-   Route53 DNS management
-   KMS keys for resource encryption

## Prerequisites

-   Ubuntu 24.04 LTS
-   Node.js 20
-   MySQL 8.0
-   AWS CLI configured with appropriate credentials
-   Minimum 512MB RAM
-   Root/sudo access
-   SSH access

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd webapp
```

2. Install dependencies:

```bash
npm install
```

3. Create application zip:

```bash
zip -r webapp.zip .
```

4. Copy files to server:

```bash
scp -i ~/.ssh/your_key webapp.zip root@your-server:/tmp/
scp -i ~/.ssh/your_key setup.sh root@your-server:/root/
```

5. Run setup script:

```bash
bash setup.sh
```

## SSL Certificate Management

### Import Certificate to ACM

```bash
# Convert certificate to PEM format if needed
openssl x509 -in certificate.crt -out certificate.pem

# Import certificate to ACM
aws acm import-certificate \
  --certificate fileb://certificate.pem \
  --private-key fileb://private.key \
  --certificate-chain fileb://chain.pem \
  --region your-region
```

## Testing

Run the test suite:

```bash
npm test
```

## Security Features

-   Application Security:

    -   Dedicated system user with limited permissions
    -   No-cache headers implementation
    -   Sniff prevention headers
    -   Input validation and sanitization
    -   Secure session handling

-   Infrastructure Security:
    -   KMS encryption for:
        -   EBS volumes
        -   RDS database
        -   S3 buckets
    -   Security group restrictions
    -   Private subnet placement
    -   SSL/TLS termination at ALB

## Monitoring and Scaling

-   CloudWatch Integration:

    -   Custom metrics collection
    -   Log aggregation
    -   CPU utilization monitoring
    -   Request count tracking
    -   Error rate monitoring

-   Auto Scaling:
    -   Scale up threshold: > 5% CPU usage
    -   Scale down threshold: < 3% CPU usage
    -   Minimum instances: 3
    -   Maximum instances: 5
    -   Instance refresh policy:
        -   Minimum healthy percentage: 90%
        -   Instance warmup: 300 seconds

## Deployment Process

1. Code changes trigger GitHub Actions workflow
2. Automated tests run against MySQL container
3. On success, Packer builds new AMI
4. AMI is shared with demo account
5. Auto Scaling Group performs instance refresh
6. Zero-downtime deployment completes

## Troubleshooting

-   Health Check Issues:

    -   Verify database connectivity
    -   Check application logs
    -   Validate security group rules
    -   Confirm instance health status

-   Deployment Problems:
    -   Review GitHub Actions logs
    -   Check Packer build output
    -   Verify AMI sharing permissions
    -   Monitor instance refresh status

## Support

For issues and feature requests, please create a GitHub issue in the repository.
