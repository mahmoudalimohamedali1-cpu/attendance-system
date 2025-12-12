#!/bin/bash

#############################################
# 🚀 Complete Setup - Run after uploading code
#############################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 إكمال تثبيت نظام الحضور والانصراف                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /var/www/attendance-system

#############################################
# Step 1: Install Backend Dependencies
#############################################
echo -e "${GREEN}[1/6] تثبيت dependencies للـ Backend...${NC}"
cd backend
npm install

#############################################
# Step 2: Generate Prisma Client & Migrate
#############################################
echo -e "${GREEN}[2/6] إعداد قاعدة البيانات...${NC}"
npx prisma generate
npx prisma migrate deploy

# Seed database (optional)
# npx prisma db seed

#############################################
# Step 3: Build Backend
#############################################
echo -e "${GREEN}[3/6] بناء Backend...${NC}"
npm run build

#############################################
# Step 4: Install Dashboard Dependencies & Build
#############################################
echo -e "${GREEN}[4/6] بناء Dashboard...${NC}"
cd ../web-admin
npm install
npm run build

#############################################
# Step 5: Start Backend with PM2
#############################################
echo -e "${GREEN}[5/6] تشغيل Backend...${NC}"
cd ../backend

# Create PM2 ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'attendance-backend',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

pm2 delete attendance-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

#############################################
# Step 6: Setup SSL & Restart Nginx
#############################################
echo -e "${GREEN}[6/6] إعداد SSL...${NC}"

# Get domain from credentials
DOMAIN=$(grep "Domain:" /root/attendance-credentials.txt | awk '{print $2}')
EMAIL=$(grep "Email:" /root/attendance-credentials.txt | awk '{print $2}')

# Get SSL certificate
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

# Restart nginx
systemctl restart nginx

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ تم التثبيت بنجاح!                                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 الروابط:${NC}"
echo "   Dashboard: https://${DOMAIN}"
echo "   API: https://${DOMAIN}/api/v1"
echo "   Health: https://${DOMAIN}/health"
echo ""
echo -e "${GREEN}📋 أوامر مفيدة:${NC}"
echo "   pm2 status          - حالة Backend"
echo "   pm2 logs            - سجلات Backend"
echo "   pm2 restart all     - إعادة تشغيل"
echo "   systemctl status nginx - حالة Nginx"
echo ""
echo -e "${GREEN}🔐 بيانات الدخول:${NC}"
echo "   راجع: /root/attendance-credentials.txt"
echo ""

