# webapp
# Health Check API

## Overview
This project implements a RESTful web application with a health check endpoint and automated deployment capabilities. The application is built using Node.js and Express, with MySQL as the database.

## Features

### Health Check Endpoint
- Endpoint: `/healthz`
- Methods: GET
- Responses:
  - `200`: Application and database are healthy
  - `400`: Invalid request (query parameters or content present)
  - `405`: Method not allowed
  - `503`: Database connection failure
- Headers:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`
  - `X-Content-Type-Options: nosniff`

### Integration Tests
- Comprehensive test suite using Jest and Supertest
- Tests cover:
  - Successful health check
  - Invalid request handling
  - Method validation
  - Non-existent routes
  - Header validation
  - Database connectivity

### Automated Deployment
The `setup.sh` script automates:
- System updates and package installation
- Swap space configuration
- MySQL installation and optimization
- Database initialization and security
- Application user and directory setup
- Node.js environment configuration
- Systemd service creation

## Technology Stack
- Node.js
- Express.js
- MySQL
- Jest (Testing)
- Supertest (API Testing)

## Prerequisites
- Ubuntu 24.04 LTS
- Minimum 512MB RAM
- Root/sudo access
- SSH access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webapp
```

2. Create application zip:
```bash
zip -r webapp.zip .
```

3. Copy files to server:
```bash
scp -i ~/.ssh/your_key webapp.zip root@your-server:/tmp/
scp -i ~/.ssh/your_key setup.sh root@your-server:/root/
```

4. Run setup script:
```bash
bash setup.sh
```

## Testing
Run the test suite:
```bash
npm test
```

## Security Features
- Dedicated application user and group
- MySQL security hardening
- Proper file permissions
- No-cache headers
- Sniff prevention headers

## Monitoring
- Health check endpoint for uptime monitoring
- Systemd service logs
- MySQL error logs

# Assignment - 03

# GitHub Actions for Webapp

This repository uses GitHub Actions to run continuous integration (CI) tests for a Node.js-based web application that connects to a MySQL database. The workflow is automatically triggered on every pull request targeting the `main` branch.

## Workflow Overview

The CI workflow is defined in a YAML file and includes the following key configurations:

- **Trigger:**  
  The workflow is triggered when a pull request is opened against the `main` branch.

- **Job Environment:**  
  The job runs on an `ubuntu-latest` runner. It sets up a MySQL service using the official MySQL 8.0 Docker image and uses health checks to ensure the MySQL service is ready before running tests.

- **MySQL Service Health Checks:**  
  The MySQL container is configured with these options:
  - `--health-cmd="mysqladmin ping --silent"`
  - `--health-interval=10s`
  - `--health-timeout=5s`
  - `--health-retries=3`

## Workflow Steps

1. **Checkout Code:**  
   Uses `actions/checkout@v3` to retrieve the repository code.

2. **Setup Node.js:**  
   Uses `actions/setup-node@v3` to install Node.js version 16.

3. **Install Dependencies:**  
   Executes `npm install` to install all required packages.

4. **Wait for MySQL Service:**  
   Runs a script that waits until the MySQL service is ready by checking if port `3306` is open.

5. **Run Tests:**  
   Executes `npm test` to run the application's test suite.

This configuration ensures that every pull request is thoroughly tested against a live MySQL environment, maintaining code quality and stability.