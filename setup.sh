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
    --no-create-home \
    --shell /usr/sbin/nologin \
    $APP_USER || true

# Application Directory Setup
echo "Configuring application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR
sudo find $APP_DIR -type d -exec chmod 750 {} \;
sudo find $APP_DIR -type f -exec chmod 640 {} \;

# Deploy Application
echo "Deploying application..."
sudo apt-get install -y -qq unzip
sudo -u $APP_USER unzip -q /tmp/webapp.zip -d $APP_DIR/

# Node Modules Setup
echo "Configuring npm environment..."
sudo -u $APP_USER mkdir -p $APP_DIR/node_modules
sudo chmod 750 $APP_DIR/node_modules

# Dependency Installation
echo "Installing dependencies..."
cd $APP_DIR
sudo -u $APP_USER npm install --production --omit=dev --no-audit --no-fund

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
Restart=always
Environment=NODE_ENV=production
ProtectSystem=full
NoNewPrivileges=true

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