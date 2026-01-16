#!/bin/bash

# Script لرفع إصلاح العهدة إلى VPS
VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"
PROJECT_PATH="/var/www/attendance-system"

echo "🚀 رفع إصلاح العهدة إلى VPS..."

# رفع الملف المعدل
expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no "web-admin/src/pages/custody/CustodyItemForm.tsx" ${VPS_USER}@${VPS_HOST}:${PROJECT_PATH}/web-admin/src/pages/custody/CustodyItemForm.tsx
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "🔨 بناء المشروع على VPS..."

# بناء المشروع
expect <<EOF
set timeout 300
spawn ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && npm run build"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "🔄 إعادة تشغيل الخدمة..."

# إعادة تشغيل الخدمة
expect <<EOF
set timeout 30
spawn ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "✅ اكتمل الرفع بنجاح!"

