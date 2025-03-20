#!/bin/bash
set -e

# Application Configuration
APP_USER="csye6225"
APP_GROUP="csye6225"
APP_DIR="/opt/csye6225"
NODE_VERSION="20"

# System Configuration
SWAP_SIZE="1G"

# System Optimization
echo "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Swap Configuration
echo "Configuring swap..."
if ! grep -q "/swapfile" /etc/fstab; then
    sudo fallocate -l $SWAP_SIZE /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# MySQL Client Installation
echo "Installing MySQL client..."
sudo apt-get install -y -qq \
    mysql-client \
    libmysqlclient-dev

# Node.js Installation
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - >/dev/null
sudo apt-get install -y -qq nodejs

# Application User Setup
echo "Configuring application user..."
sudo groupadd --system $APP_GROUP || true
sudo useradd \
    --system \
    --gid $APP_GROUP \
    --create-home \
    --shell /usr/sbin/nologin \
    $APP_USER || true

# Application Directory Setup
echo "Configuring application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR
sudo chmod 755 $APP_DIR  # Relax permissions for npm operations

# Set up npm configuration
echo "Configuring npm environment..."
sudo -u $APP_USER mkdir -p $APP_DIR/.npm/{cache,global}
sudo -u $APP_USER npm config set cache "$APP_DIR/.npm/cache"
sudo -u $APP_USER npm config set prefix "$APP_DIR/.npm/global"

# Deploy Application
echo "Deploying application..."
sudo apt-get install -y -qq unzip
sudo -u $APP_USER unzip -q /tmp/webapp.zip -d $APP_DIR/

# Fix directory ownership after unzip
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR

# Dependency Installation
echo "Installing dependencies..."
cd $APP_DIR
sudo -u $APP_USER npm install --production --omit=dev --no-audit --no-fund --unsafe-perm

# Clean npm cache
sudo -u $APP_USER npm cache clean --force

# Systemd Service Configuration
echo "Configuring system service..."
sudo tee /etc/systemd/system/webapp.service >/dev/null <<EOF
[Unit]
Description=Web Application
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/app.js
EnvironmentFile=-/opt/csye6225/.env
Restart=always
Environment=NODE_ENV=production
ProtectSystem=full
NoNewPrivileges=true

# NPM environment variables
Environment=NPM_CONFIG_CACHE=$APP_DIR/.npm/cache
Environment=NPM_CONFIG_PREFIX=$APP_DIR/.npm/global

[Install]
WantedBy=multi-user.target
EOF

# Enable Service
echo "Enabling application service..."
sudo systemctl daemon-reload
sudo systemctl enable webapp.service

# Cleanup
echo "Cleaning up temporary files..."
sudo rm -f /tmp/webapp.zip /tmp/setup.sh

echo "Application deployment completed successfully"