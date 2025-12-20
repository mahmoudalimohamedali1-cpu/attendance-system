#!/bin/bash

# سكريبت لتنفيذ الأوامر على VPS بعد نقل الملفات
# Usage: ./update-vps-commands.sh

set -e

VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"

# دالة لتنفيذ أوامر على VPS
run_command() {
    local command="$1"
    expect <<EOF
set timeout 120
spawn ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "$command"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF
}

echo "🚀 بدء تحديث VPS..."
echo ""

# اكتشاف المسار
echo "🔍 اكتشاف مسار المشروع..."
PROJECT_PATH=$(run_command "test -d /var/www/attendance-system && echo '/var/www/attendance-system' || test -d /root/attendance-system && echo '/root/attendance-system' || echo '/var/www/html'" | grep -E "^/" | head -1 | tr -d '\r\n')

if [ -z "$PROJECT_PATH" ]; then
    PROJECT_PATH="/var/www/attendance-system"
fi

echo "✅ المسار: $PROJECT_PATH"
echo ""

# تحديث Backend
echo "📦 تحديث Backend..."
run_command "cd $PROJECT_PATH/backend && npm install"

echo "🔨 بناء Backend..."
run_command "cd $PROJECT_PATH/backend && npm run build"

echo "📊 تطبيق Migration..."
run_command "cd $PROJECT_PATH/backend && npx prisma migrate deploy || psql \$DATABASE_URL -f prisma/migrations/apply_letters_migration.sql"

echo "🔄 إعادة بناء Prisma Client..."
run_command "cd $PROJECT_PATH/backend && npx prisma generate"

echo "🔄 إعادة تشغيل Backend..."
run_command "cd $PROJECT_PATH/backend && pm2 restart backend || pm2 restart all || systemctl restart attendance-backend || echo 'Manual restart needed'"

echo ""
echo "📦 تحديث Dashboard..."
run_command "cd $PROJECT_PATH/web-admin && npm install"

echo "🔨 بناء Dashboard..."
run_command "cd $PROJECT_PATH/web-admin && npm run build"

echo "🔄 إعادة تشغيل Dashboard..."
run_command "cd $PROJECT_PATH/web-admin && pm2 restart web-admin || pm2 restart all || echo 'Manual restart needed'"

echo ""
echo "✅ اكتمل التحديث بنجاح!"
echo ""
echo "🔍 للتحقق:"
echo "   curl http://localhost:3000/api/letters/pending/all"
echo ""

