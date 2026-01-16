#!/bin/bash

# سكريبت لرفع إصلاح العهدة إلى VPS
# Usage: ./deploy-custody-fix.sh

VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"
PROJECT_PATH="/var/www/attendance-system"
LOCAL_FILE="web-admin/src/pages/custody/CustodyItemForm.tsx"
REMOTE_FILE="${PROJECT_PATH}/web-admin/src/pages/custody/CustodyItemForm.tsx"

echo "🚀 رفع إصلاح العهدة إلى VPS..."
echo ""

# رفع الملف
echo "📤 رفع الملف..."
sshpass -p "${VPS_PASS}" scp -o StrictHostKeyChecking=no "${LOCAL_FILE}" ${VPS_USER}@${VPS_HOST}:"${REMOTE_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ تم رفع الملف بنجاح!"
else
    echo "❌ فشل رفع الملف"
    exit 1
fi

echo ""
echo "🔨 بناء المشروع..."
sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && npm run build"

if [ $? -eq 0 ]; then
    echo "✅ تم البناء بنجاح!"
else
    echo "⚠️  حدث خطأ أثناء البناء"
fi

echo ""
echo "🔄 إعادة تشغيل الخدمة..."
sshpass -p "${VPS_PASS}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "cd ${PROJECT_PATH}/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'"

echo ""
echo "✅ اكتمل النشر بنجاح!"
echo ""
echo "🔍 للتحقق من التحديث، افتح المتصفح وتحقق من صفحة إضافة العهدة"

