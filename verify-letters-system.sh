#!/bin/bash

# سكريبت للتحقق من أن نظام الخطابات مربوط بشكل صحيح

echo "🔍 التحقق من نظام الخطابات..."
echo ""

# 1. التحقق من Database Migration
echo "1️⃣ التحقق من Database Migration..."
cd /var/www/attendance-system/backend
if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
    echo "✅ Database schema محدث"
else
    echo "⚠️  يجب تشغيل Migration:"
    echo "   cd /var/www/attendance-system/backend"
    echo "   npx prisma migrate deploy"
fi
echo ""

# 2. التحقق من مجلد المرفقات
echo "2️⃣ التحقق من مجلد المرفقات..."
if [ -d "/var/www/attendance-system/uploads/letters" ]; then
    echo "✅ مجلد letters موجود"
    ls -la /var/www/attendance-system/uploads/letters | head -5
else
    echo "⚠️  يجب إنشاء مجلد letters:"
    echo "   mkdir -p /var/www/attendance-system/uploads/letters"
    echo "   chmod 755 /var/www/attendance-system/uploads/letters"
fi
echo ""

# 3. التحقق من Backend Service
echo "3️⃣ التحقق من Backend Service..."
if pm2 list | grep -q "attendance-backend"; then
    echo "✅ Backend service يعمل"
    pm2 info attendance-backend | grep -E "status|uptime|restarts"
else
    echo "❌ Backend service غير موجود"
fi
echo ""

# 4. التحقق من API Endpoints
echo "4️⃣ التحقق من API Endpoints..."
API_URL="http://localhost:3000/api/v1"
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
    echo "✅ API يعمل"
else
    echo "⚠️  API غير متاح"
fi
echo ""

# 5. التحقق من Nginx Config
echo "5️⃣ التحقق من Nginx Config..."
if grep -q "/uploads/letters" /etc/nginx/sites-available/attendance 2>/dev/null; then
    echo "✅ Nginx config يحتوي على /uploads/letters"
else
    echo "⚠️  يجب إضافة location /uploads/letters/ في Nginx config"
fi
echo ""

# 6. التحقق من الملفات الأساسية
echo "6️⃣ التحقق من الملفات الأساسية..."
FILES=(
    "/var/www/attendance-system/backend/src/modules/letters/letters.controller.ts"
    "/var/www/attendance-system/backend/src/modules/letters/letters.service.ts"
    "/var/www/attendance-system/backend/src/modules/letters/letters.module.ts"
    "/var/www/attendance-system/web-admin/src/pages/letters/LettersPage.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename $file)"
    else
        echo "❌ $(basename $file) غير موجود"
    fi
done
echo ""

echo "✅ انتهى التحقق!"
echo ""
echo "📝 الخطوات التالية إذا كان هناك مشاكل:"
echo "   1. تشغيل Migration: cd /var/www/attendance-system/backend && npx prisma migrate deploy"
echo "   2. إنشاء مجلد المرفقات: mkdir -p /var/www/attendance-system/uploads/letters"
echo "   3. إعادة تشغيل Backend: pm2 restart attendance-backend"
echo "   4. إعادة تحميل Nginx: sudo nginx -t && sudo systemctl reload nginx"

