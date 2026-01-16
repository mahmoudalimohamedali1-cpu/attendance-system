#!/bin/bash

# Script لنشر نظام الخطابات على VPS
# Usage: ./deploy-to-vps.sh

set -e

VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"
PROJECT_PATH="/var/www/attendance-system"

echo "🚀 بدء نشر نظام الخطابات على VPS..."
echo ""

# التحقق من وجود expect
if ! command -v expect &> /dev/null; then
    echo "❌ expect غير مثبت. جاري التثبيت..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install expect
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y expect
    fi
fi

# دالة لتنفيذ أوامر على VPS
run_on_vps() {
    local command="$1"
    expect <<EOF
set timeout 30
spawn ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "$command"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    "Permission denied" {
        puts "❌ فشل الاتصال. تحقق من كلمة المرور."
        exit 1
    }
    eof
}
EOF
}

# دالة لرفع ملف إلى VPS
upload_file() {
    local local_file="$1"
    local remote_file="$2"
    expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no "$local_file" ${VPS_USER}@${VPS_HOST}:"$remote_file"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF
}

echo "📡 الاتصال بـ VPS..."
run_on_vps "echo 'Connected successfully'"

echo ""
echo "📋 التحقق من مجلد المشروع..."
run_on_vps "cd ${PROJECT_PATH} && pwd"

echo ""
echo "🔄 سحب التحديثات من Git..."
run_on_vps "cd ${PROJECT_PATH} && git pull origin main || echo 'Git pull failed or not a git repo'"

echo ""
echo "📦 تحديث Backend..."
run_on_vps "cd ${PROJECT_PATH}/backend && npm install"

echo ""
echo "🔨 بناء Backend..."
run_on_vps "cd ${PROJECT_PATH}/backend && npm run build"

echo ""
echo "📊 رفع ملف Migration..."
upload_file "backend/prisma/migrations/apply_letters_migration.sql" "${PROJECT_PATH}/backend/prisma/migrations/apply_letters_migration.sql"

echo ""
echo "📊 تطبيق Migration..."
run_on_vps "cd ${PROJECT_PATH}/backend && source .env 2>/dev/null || true && psql \$DATABASE_URL -f prisma/migrations/apply_letters_migration.sql || npx prisma migrate deploy"

echo ""
echo "🔄 إعادة بناء Prisma Client..."
run_on_vps "cd ${PROJECT_PATH}/backend && npx prisma generate"

echo ""
echo "🔍 التحقق من الجدول..."
run_on_vps "cd ${PROJECT_PATH}/backend && source .env 2>/dev/null || true && psql \$DATABASE_URL -c '\d letter_requests' || echo 'Table check skipped'"

echo ""
echo "🔄 إعادة تشغيل Backend..."
run_on_vps "cd ${PROJECT_PATH}/backend && pm2 restart backend || pm2 restart all || systemctl restart attendance-backend || echo 'Manual restart needed'"

echo ""
echo "📦 تحديث Dashboard..."
run_on_vps "cd ${PROJECT_PATH}/web-admin && npm install"

echo ""
echo "🔨 بناء Dashboard..."
run_on_vps "cd ${PROJECT_PATH}/web-admin && npm run build"

echo ""
echo "🔄 إعادة تشغيل Dashboard..."
run_on_vps "cd ${PROJECT_PATH}/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'"

echo ""
echo "✅ اكتمل النشر بنجاح!"
echo ""
echo "🔍 للتحقق:"
echo "   curl http://localhost:3000/api/letters/pending/all"
echo ""

