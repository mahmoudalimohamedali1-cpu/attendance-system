#!/bin/bash

# سكريبت سريع لتحديث VPS
# استخدمه بعد تعديل المسار الصحيح

VPS="root@72.61.239.170"
VPS_PATH="/var/www/html"  # غيّر هذا للمسار الصحيح

echo "🚀 تحديث VPS..."
echo "المسار: $VPS_PATH"
echo ""

# نسخ الملفات
echo "📤 نسخ ملفات Backend..."
scp -r backend/src/modules/letters $VPS:$VPS_PATH/backend/src/modules/
scp backend/src/app.module.ts $VPS:$VPS_PATH/backend/src/
scp backend/src/modules/reports/reports.service.ts $VPS:$VPS_PATH/backend/src/modules/reports/
scp -r backend/prisma/migrations/20251215002000_add_letter_requests $VPS:$VPS_PATH/backend/prisma/migrations/
scp backend/prisma/migrations/apply_letters_migration.sql $VPS:$VPS_PATH/backend/prisma/migrations/
scp backend/prisma/schema.prisma $VPS:$VPS_PATH/backend/prisma/

echo "📤 نسخ ملفات Dashboard..."
scp -r web-admin/src/pages/letters $VPS:$VPS_PATH/web-admin/src/pages/
scp web-admin/src/App.tsx $VPS:$VPS_PATH/web-admin/src/
scp web-admin/src/components/layout/MainLayout.tsx $VPS:$VPS_PATH/web-admin/src/components/layout/
scp web-admin/src/config/api.ts $VPS:$VPS_PATH/web-admin/src/config/
scp web-admin/src/pages/dashboard/DashboardPage.tsx $VPS:$VPS_PATH/web-admin/src/pages/dashboard/

echo ""
echo "✅ تم نسخ الملفات!"
echo ""
echo "الآن على VPS نفذ:"
echo "cd $VPS_PATH/backend"
echo "npm install && npm run build"
echo "npx prisma migrate deploy"
echo "npx prisma generate"
echo "pm2 restart backend"
echo ""
echo "cd ../web-admin"
echo "npm install && npm run build"
echo "pm2 restart web-admin"
echo ""

