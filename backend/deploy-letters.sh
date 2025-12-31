#!/bin/bash

# Script لنشر نظام الخطابات على VPS
# Usage: ./deploy-letters.sh

set -e

echo "🚀 بدء نشر نظام الخطابات على VPS..."

# التحقق من أننا في مجلد backend
if [ ! -f "package.json" ]; then
    echo "❌ يجب تشغيل السكريبت من مجلد backend!"
    exit 1
fi

# 1. تثبيت الحزم
echo "📦 تثبيت الحزم..."
npm install

# 2. بناء المشروع
echo "🔨 بناء المشروع..."
npm run build

# 3. تطبيق Migration
echo "📊 تطبيق Migration..."
if [ -f "prisma/migrations/apply_letters_migration.sql" ]; then
    if [ -z "$DATABASE_URL" ]; then
        echo "⚠️  DATABASE_URL غير موجود. تأكد من وجود .env"
        echo "📋 تطبيق Migration يدوياً:"
        echo "   psql \$DATABASE_URL -f prisma/migrations/apply_letters_migration.sql"
    else
        psql "$DATABASE_URL" -f prisma/migrations/apply_letters_migration.sql
        echo "✅ تم تطبيق Migration"
    fi
else
    echo "⚠️  ملف Migration غير موجود. استخدام Prisma Migrate..."
    npx prisma migrate deploy
fi

# 4. إعادة بناء Prisma Client
echo "🔄 إعادة بناء Prisma Client..."
npx prisma generate

# 5. التحقق من الجدول
echo "🔍 التحقق من الجدول..."
if psql "$DATABASE_URL" -c "\d letter_requests" > /dev/null 2>&1; then
    echo "✅ جدول letter_requests موجود"
else
    echo "❌ جدول letter_requests غير موجود!"
    exit 1
fi

# 6. إعادة تشغيل Backend
echo "🔄 إعادة تشغيل Backend..."
if command -v pm2 &> /dev/null; then
    pm2 restart backend || pm2 restart all
    echo "✅ تم إعادة تشغيل Backend باستخدام PM2"
elif systemctl is-active --quiet attendance-backend 2>/dev/null; then
    sudo systemctl restart attendance-backend
    echo "✅ تم إعادة تشغيل Backend باستخدام systemd"
else
    echo "⚠️  لم يتم العثور على PM2 أو systemd"
    echo "📋 يرجى إعادة تشغيل Backend يدوياً:"
    echo "   npm run start:prod"
fi

echo ""
echo "✅ اكتمل النشر بنجاح!"
echo ""
echo "🔍 للتحقق:"
echo "   curl http://localhost:3000/api/letters/pending/all"
echo ""

