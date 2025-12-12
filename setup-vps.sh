#!/bin/bash

#############################################
# 🚀 Attendance System - VPS Setup Script
# Hostinger VPS - Ubuntu 22.04
#############################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 تثبيت نظام الحضور والانصراف على VPS                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - سيتم تعديلها
DOMAIN=""
EMAIL=""
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

# Get user input
echo -e "${YELLOW}أدخل الدومين (مثال: attendance.yourcompany.com):${NC}"
read -r DOMAIN
echo -e "${YELLOW}أدخل الإيميل (للـ SSL):${NC}"
read -r EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}خطأ: الدومين والإيميل مطلوبين!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ الإعدادات:${NC}"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

#############################################
# Step 1: Update System
#############################################
echo -e "${GREEN}[1/8] تحديث النظام...${NC}"
apt update && apt upgrade -y

#############################################
# Step 2: Install Node.js 20
#############################################
echo -e "${GREEN}[2/8] تثبيت Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

#############################################
# Step 3: Install PostgreSQL
#############################################
echo -e "${GREEN}[3/8] تثبيت PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER attendance_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE attendance_db OWNER attendance_user;
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
\q
EOF

echo -e "${GREEN}✅ قاعدة البيانات جاهزة${NC}"

#############################################
# Step 4: Install Nginx
#############################################
echo -e "${GREEN}[4/8] تثبيت Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

#############################################
# Step 5: Install PM2
#############################################
echo -e "${GREEN}[5/8] تثبيت PM2...${NC}"
npm install -g pm2

#############################################
# Step 6: Install Certbot (SSL)
#############################################
echo -e "${GREEN}[6/8] تثبيت Certbot للـ SSL...${NC}"
apt install -y certbot python3-certbot-nginx

#############################################
# Step 7: Clone and Setup Project
#############################################
echo -e "${GREEN}[7/8] تجهيز المشروع...${NC}"

# Create app directory
mkdir -p /var/www/attendance-system
cd /var/www/attendance-system

# Create directory structure
mkdir -p backend web-admin

echo -e "${YELLOW}الآن ارفع الكود باستخدام Git أو SCP${NC}"
echo "سنكمل الإعداد بعد رفع الكود..."

#############################################
# Step 8: Create Configuration Files
#############################################
echo -e "${GREEN}[8/8] إنشاء ملفات الإعدادات...${NC}"

# Create Backend .env file
cat > /var/www/attendance-system/backend/.env <<EOF
# Database
DATABASE_URL="postgresql://attendance_user:${DB_PASSWORD}@localhost:5432/attendance_db"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="${JWT_SECRET}_refresh"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV=production

# CORS
FRONTEND_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN}
EOF

# Create Dashboard .env file
cat > /var/www/attendance-system/web-admin/.env <<EOF
VITE_API_BASE_URL=https://${DOMAIN}/api/v1
EOF

# Create Nginx configuration
cat > /etc/nginx/sites-available/attendance <<EOF
# Attendance System - Nginx Configuration

server {
    listen 80;
    server_name ${DOMAIN};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # SSL will be configured by Certbot
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Dashboard (React)
    root /var/www/attendance-system/web-admin/dist;
    index index.html;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ تم تثبيت المتطلبات بنجاح!                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 الخطوات التالية:${NC}"
echo ""
echo "1️⃣  ارفع الكود إلى السيرفر:"
echo "    scp -r ./backend/* root@YOUR_IP:/var/www/attendance-system/backend/"
echo "    scp -r ./web-admin/* root@YOUR_IP:/var/www/attendance-system/web-admin/"
echo ""
echo "2️⃣  شغّل سكريبت الإكمال:"
echo "    bash /var/www/attendance-system/complete-setup.sh"
echo ""
echo -e "${GREEN}📝 معلومات قاعدة البيانات (احتفظ بها):${NC}"
echo "   Database: attendance_db"
echo "   User: attendance_user"
echo "   Password: ${DB_PASSWORD}"
echo ""
echo -e "${GREEN}🔐 JWT Secret:${NC}"
echo "   ${JWT_SECRET}"
echo ""

# Save credentials
cat > /root/attendance-credentials.txt <<EOF
=== Attendance System Credentials ===
Generated: $(date)

Domain: ${DOMAIN}
Email: ${EMAIL}

Database:
  Host: localhost
  Port: 5432
  Database: attendance_db
  User: attendance_user
  Password: ${DB_PASSWORD}

JWT Secret: ${JWT_SECRET}

Files:
  Backend: /var/www/attendance-system/backend
  Dashboard: /var/www/attendance-system/web-admin
  Nginx: /etc/nginx/sites-available/attendance
  Backend .env: /var/www/attendance-system/backend/.env
  Dashboard .env: /var/www/attendance-system/web-admin/.env
EOF

echo -e "${GREEN}✅ تم حفظ البيانات في: /root/attendance-credentials.txt${NC}"

