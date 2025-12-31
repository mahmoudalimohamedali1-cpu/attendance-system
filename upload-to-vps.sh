#!/bin/bash

# Script لنقل نظام الخطابات مباشرة إلى VPS
# Usage: ./upload-to-vps.sh

set -e

VPS_HOST="72.61.239.170"
VPS_USER="root"
VPS_PASS="GamalSaad35@#"
VPS_PATH="/var/www/attendance-system"  # سنكتشف المسار الصحيح

echo "🚀 بدء نقل نظام الخطابات إلى VPS..."
echo ""

# دالة للتحقق من المسار
check_path() {
    expect <<EOF
set timeout 10
spawn ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "test -d /var/www/attendance-system && echo '/var/www/attendance-system' || test -d /root/attendance-system && echo '/root/attendance-system' || test -d /home/attendance-system && echo '/home/attendance-system' || echo 'NOT_FOUND'"
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof {
        catch wait result
        exit [lindex \$result 3]
    }
}
EOF
}

echo "🔍 البحث عن مسار المشروع على VPS..."
ACTUAL_PATH=$(check_path | grep -v "password:" | grep -v "spawn" | tail -1 | tr -d '\r\n')

if [ "$ACTUAL_PATH" == "NOT_FOUND" ] || [ -z "$ACTUAL_PATH" ]; then
    echo "⚠️  لم يتم العثور على المسار. سنستخدم /var/www/attendance-system"
    ACTUAL_PATH="/var/www/attendance-system"
else
    echo "✅ تم العثور على المسار: $ACTUAL_PATH"
fi

VPS_PATH="$ACTUAL_PATH"

echo ""
echo "📤 نقل ملفات Backend..."

# نقل مجلد letters
expect <<EOF
set timeout 60
spawn scp -r -o StrictHostKeyChecking=no backend/src/modules/letters ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/modules/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

# نقل Migration
expect <<EOF
set timeout 60
spawn scp -r -o StrictHostKeyChecking=no backend/prisma/migrations/20251215002000_add_letter_requests ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/migrations/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no backend/prisma/migrations/apply_letters_migration.sql ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/migrations/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

# نقل ملفات محدثة
expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no backend/src/app.module.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no backend/src/modules/reports/reports.service.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/modules/reports/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no backend/prisma/schema.prisma ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "📤 نقل ملفات Dashboard..."

# نقل صفحة الخطابات
expect <<EOF
set timeout 60
spawn scp -r -o StrictHostKeyChecking=no web-admin/src/pages/letters ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/web-admin/src/pages/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

# نقل ملفات محدثة
expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no web-admin/src/App.tsx ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/web-admin/src/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no web-admin/src/components/layout/MainLayout.tsx ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/web-admin/src/components/layout/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no web-admin/src/config/api.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/web-admin/src/config/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

expect <<EOF
set timeout 60
spawn scp -o StrictHostKeyChecking=no web-admin/src/pages/dashboard/DashboardPage.tsx ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/web-admin/src/pages/dashboard/
expect {
    "password:" {
        send "${VPS_PASS}\r"
        exp_continue
    }
    eof
}
EOF

echo ""
echo "✅ تم نقل الملفات بنجاح!"
echo ""
echo "🔄 الآن قم بتشغيل الأوامر التالية على VPS:"
echo ""
echo "ssh root@72.61.239.170"
echo "cd $VPS_PATH/backend"
echo "npm install"
echo "npm run build"
echo "npx prisma migrate deploy"
echo "npx prisma generate"
echo "pm2 restart backend"
echo ""
echo "cd ../web-admin"
echo "npm install"
echo "npm run build"
echo "pm2 restart web-admin"
echo ""

