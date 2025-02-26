#!/bin/bash

# Exit on any error
set -e

# Check required environment variables
if [ -z "$DB_PASS" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: Required environment variables not set"
    echo "Please export: DB_PASS, DB_NAME, DB_USER"
    exit 1
fi

# Variables
APP_USER="csye6225"
APP_GROUP="csye6225"
APP_DIR="/opt/csye6225"

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Create swap file
echo "Setting up swap space..."
if grep -q "/swapfile" /etc/fstab; then
    echo "Swap file already exists, skipping swap creation..."
else
    sudo swapoff /swapfile || true
    sudo rm -f /swapfile
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Install MySQL prerequisites
echo "Installing MySQL prerequisites..."
sudo apt-get update
sudo apt-get install -y wget gnupg lsb-release

# Add MySQL repository properly
echo "Adding MySQL repository..."
curl -fsSL https://repo.mysql.com/RPM-GPG-KEY-mysql-2023 | sudo gpg --dearmor -o /usr/share/keyrings/mysql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/mysql-keyring.gpg] http://repo.mysql.com/apt/ubuntu $(lsb_release -sc) mysql-8.0" | sudo tee /etc/apt/sources.list.d/mysql.list

# Install MySQL
echo "Installing MySQL..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server

# Stop MySQL and prepare for configuration
echo "Configuring MySQL..."
sudo systemctl stop mysql || true

# Clean and prepare MySQL directories
sudo rm -rf /var/lib/mysql/*
sudo mkdir -p /var/lib/mysql
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod 750 /var/lib/mysql

# Configure MySQL
sudo mkdir -p /etc/mysql/mysql.conf.d
sudo bash -c "cat > /etc/mysql/mysql.conf.d/mysqld.cnf << EOF
[mysqld]
bind-address = 127.0.0.1
performance_schema = off
key_buffer_size = 16M
max_connections = 15
innodb_buffer_pool_size = 128M
innodb_log_buffer_size = 4M
thread_cache_size = 8
table_open_cache = 256
tmp_table_size = 32M
max_heap_table_size = 32M
default_authentication_plugin = mysql_native_password
innodb_file_per_table = 1
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 2
EOF"

# Initialize MySQL
echo "Initializing MySQL..."
sudo mysqld --initialize-insecure --user=mysql

# Start MySQL with timeout
echo "Starting MySQL..."
sudo systemctl start mysql

# Wait for MySQL to start
timeout=60
while ! sudo systemctl is-active --quiet mysql && [ $timeout -gt 0 ]; do
    sleep 1
    timeout=$((timeout-1))
done

if [ $timeout -eq 0 ]; then
    echo "Timeout waiting for MySQL to start"
    exit 1
fi

sudo systemctl enable mysql

# Configure MySQL security
echo "Configuring MySQL security..."
sudo mysql --user=root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASS';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application group and user
echo "Creating application group and user..."
sudo groupadd -f "$APP_GROUP"
# Update the user creation line
sudo useradd -m -g "$APP_GROUP" -s /usr/sbin/nologin "$APP_USER" 2>/dev/null || true

# Verify application user
if ! id -u "$APP_USER" >/dev/null 2>&1; then
    echo "Failed to create application user $APP_USER"
    exit 1
fi

# Create application directory and unzip webapp
echo "Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"

# Install unzip if not present
echo "Installing unzip..."
sudo apt-get install -y unzip

# Unzip application
echo "Unzipping application..."
if [ -f "/tmp/webapp.zip" ]; then
    sudo unzip -o "/tmp/webapp.zip" -d "$APP_DIR/"
else
    echo "Error: webapp.zip not found in /tmp directory"
    exit 1
fi

# Set permissions
echo "Setting permissions..."
sudo chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"

# Create systemd service file
# Update WorkingDirectory in systemd service
echo "Creating systemd service..."
sudo bash -c "cat > /etc/systemd/system/webapp.service << EOF
[Unit]
Description=Web Application
After=network.target mysql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF"

# Verify systemd service
echo "Verifying systemd service..."
if ! sudo systemctl daemon-reload; then
    echo "Failed to reload systemd daemon"
    exit 1
fi

if ! sudo systemctl enable webapp.service; then
    echo "Failed to enable webapp service"
    exit 1
fi

if ! sudo systemctl start webapp.service; then
    echo "Failed to start webapp service"
    exit 1
fi

if ! sudo systemctl is-active --quiet webapp.service; then
    echo "Webapp service is not running"
    exit 1
fi

# Update .env file using environment variables
# Update .env file path
echo "Creating .env file..."
sudo -u "$APP_USER" bash -c "cat > $APP_DIR/.env << EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_HOST=localhost
PORT=8080
EOF"

# Update .env file permissions
sudo chown "$APP_USER:$APP_GROUP" "$APP_DIR/.env"
sudo chmod 600 "$APP_DIR/.env"

echo "Setup completed successfully!"
