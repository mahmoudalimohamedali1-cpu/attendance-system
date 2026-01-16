#!/bin/bash

VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"
PROJECT_PATH="/var/www/attendance-system"
LOCAL_FILE="web-admin/src/pages/custody/CustodyItemForm.tsx"
REMOTE_FILE="${PROJECT_PATH}/web-admin/src/pages/custody/CustodyItemForm.tsx"

echo "🚀 رفع إصلاح العهدة إلى VPS..."

# التحقق من وجود sshpass
if command -v sshpass &> /dev/null; then
    echo "📤 رفع الملف باستخدام sshpass..."
    sshpass -p "${VPS_PASS}" scp -o StrictHostKeyChecking=no "${LOCAL_FILE}" ${VPS_USER}@${VPS_HOST}:"${REMOTE_FILE}"
    
    echo "🔨 بناء المشروع..."
    sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && npm run build"
    
    echo "🔄 إعادة تشغيل الخدمة..."
    sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'"
    
    echo "✅ اكتمل الرفع بنجاح!"
else
    echo "❌ sshpass غير مثبت. جاري التثبيت..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
    
    echo "🔄 يرجى تشغيل السكريبت مرة أخرى بعد تثبيت sshpass"
fi

