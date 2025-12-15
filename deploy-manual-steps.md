# خطوات النشر اليدوية على VPS

## معلومات الاتصال:
- **Host:** 72.61.239.170
- **User:** root
- **Password:** GamalSaad35@#

---

## الطريقة الأولى: استخدام السكريبت التلقائي

```bash
cd /Users/gamal/attendance-system
./deploy-to-vps.sh
```

---

## الطريقة الثانية: خطوات يدوية

### 1. الاتصال بـ VPS
```bash
ssh root@72.61.239.170
# Password: GamalSaad35@#
```

### 2. الانتقال إلى مجلد المشروع
```bash
cd /root/attendance-system
```

### 3. سحب التحديثات من Git
```bash
git pull origin main
```

### 4. تحديث Backend
```bash
cd backend
npm install
npm run build
```

### 5. تطبيق Migration
```bash
# الطريقة الأولى: استخدام Prisma
npx prisma migrate deploy

# أو الطريقة الثانية: تطبيق SQL مباشرة
source .env
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql
```

### 6. إعادة بناء Prisma Client
```bash
npx prisma generate
```

### 7. التحقق من الجدول
```bash
psql $DATABASE_URL -c "\d letter_requests"
```

### 8. إعادة تشغيل Backend
```bash
pm2 restart backend
# أو
pm2 restart all
```

### 9. تحديث Dashboard
```bash
cd ../web-admin
npm install
npm run build
```

### 10. إعادة تشغيل Dashboard
```bash
pm2 restart web-admin
# أو
pm2 restart all
```

---

## التحقق من النجاح:

### على VPS:
```bash
# التحقق من Backend
curl http://localhost:3000/api/letters/pending/all

# التحقق من PM2
pm2 list

# التحقق من Logs
pm2 logs backend --lines 50
```

### في المتصفح:
1. افتح Dashboard
2. يجب أن ترى رابط "الخطابات" في القائمة الجانبية
3. يجب أن ترى بطاقة "خطابات معلقة" في Dashboard

---

## إذا واجهت مشاكل:

### Backend لا يعمل:
```bash
pm2 logs backend
cd /root/attendance-system/backend
npm run start:prod
```

### Migration فشل:
```bash
cd /root/attendance-system/backend
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql
```

### Dashboard لا يظهر التحديثات:
```bash
cd /root/attendance-system/web-admin
npm run build
pm2 restart web-admin
```

