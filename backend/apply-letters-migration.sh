#!/bin/bash

# Script لتطبيق Migration للخطابات على VPS
# Usage: ./apply-letters-migration.sh

set -e

echo "🚀 بدء تطبيق Migration للخطابات..."

# التحقق من وجود .env
if [ ! -f .env ]; then
    echo "❌ ملف .env غير موجود!"
    exit 1
fi

# قراءة DATABASE_URL من .env
source .env

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL غير موجود في .env!"
    exit 1
fi

echo "📋 تطبيق Migration..."
psql "$DATABASE_URL" -f prisma/migrations/apply_letters_migration.sql

echo "✅ تم تطبيق Migration بنجاح!"

# التحقق من النجاح
echo "🔍 التحقق من الجداول..."
psql "$DATABASE_URL" -c "\d letter_requests" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ جدول letter_requests موجود بنجاح!"
else
    echo "❌ فشل التحقق من الجدول"
    exit 1
fi

echo "🎉 اكتمل تطبيق Migration بنجاح!"

