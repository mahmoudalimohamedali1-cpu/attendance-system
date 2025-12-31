#!/bin/bash
# سكريبت مزامنة شامل لتحديثات الرواتب والمعادلات والهياكل
# IP: 72.61.239.170

set -e

VPS_USER="root"
VPS_HOST="72.61.239.170"
VPS_PASS="GamalSaad35@#"
PROJECT_PATH="/var/www/attendance-system"

echo "📦 ضغط الملفات (شامل كافة المسارات الضرورية)..."
tar -cvzf payroll_update.tar.gz \
    backend/src/modules/payroll-calculation \
    backend/src/modules/salary-structures \
    backend/src/modules/salary-components \
    backend/src/modules/salary-assignments \
    backend/src/modules/payroll-runs \
    backend/src/modules/gosi \
    backend/src/modules/eos \
    backend/src/modules/users \
    web-admin/src/pages/salary \
    web-admin/src/pages/payroll \
    web-admin/src/pages/eos \
    web-admin/src/services


echo "📤 رفع الملفات إلى VPS..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no payroll_update.tar.gz ${VPS_USER}@${VPS_HOST}:${PROJECT_PATH}/

echo "🏗️ فك الضغط وبناء المشروع على VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} <<EOF
    cd ${PROJECT_PATH}
    tar -xvzf payroll_update.tar.gz
    
    echo "⚙️ تحديث Backend..."
    cd backend
    npm run build
    pm2 restart backend || pm2 restart all
    
    echo "⚙️ تحديث Dashboard..."
    cd ../web-admin
    npm run build
    pm2 restart web-admin || pm2 restart all
    
    rm ${PROJECT_PATH}/payroll_update.tar.gz
    echo "✨ تم التحديث الشامل بنجاح!"
EOF

# تنظيف محلي
rm payroll_update.tar.gz
