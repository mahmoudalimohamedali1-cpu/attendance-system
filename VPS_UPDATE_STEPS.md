# خطوات تحديث VPS بنظام الخطابات

## معلومات الاتصال:
- **IP:** 72.61.239.170
- **User:** root
- **Password:** GamalSaad35@#

---

## الطريقة السريعة (يدوياً):

### 1. الاتصال بـ VPS
```bash
ssh root@72.61.239.170
# Password: GamalSaad35@#
```

### 2. اكتشاف مسار المشروع
```bash
# جرب هذه المسارات:
cd /var/www/html
# أو
cd /var/www/attendance-system
# أو
cd /root/attendance-system
# أو
cd /home/attendance-system

# ثم تحقق من وجود backend:
ls -la
```

### 3. بعد العثور على المسار، نفذ:

```bash
# افترض أن المسار هو /var/www/html (أو أي مسار آخر)
cd /var/www/html  # أو المسار الصحيح

# تحديث Backend
cd backend
npm install
npm run build

# تطبيق Migration
npx prisma migrate deploy
# أو إذا فشل:
source .env
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql

# إعادة بناء Prisma
npx prisma generate

# إعادة تشغيل Backend
pm2 restart backend
# أو
pm2 restart all

# تحديث Dashboard
cd ../web-admin
npm install
npm run build

# إعادة تشغيل Dashboard
pm2 restart web-admin
# أو
pm2 restart all
```

---

## أو استخدم rsync من جهازك المحلي:

### 1. من جهازك المحلي، نفذ:

```bash
cd /Users/gamal/attendance-system

# نقل ملفات Backend
rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/src/modules/letters/ \
  root@72.61.239.170:/var/www/html/backend/src/modules/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/src/app.module.ts \
  root@72.61.239.170:/var/www/html/backend/src/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/src/modules/reports/reports.service.ts \
  root@72.61.239.170:/var/www/html/backend/src/modules/reports/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/prisma/migrations/20251215002000_add_letter_requests/ \
  root@72.61.239.170:/var/www/html/backend/prisma/migrations/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/prisma/migrations/apply_letters_migration.sql \
  root@72.61.239.170:/var/www/html/backend/prisma/migrations/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  backend/prisma/schema.prisma \
  root@72.61.239.170:/var/www/html/backend/prisma/

# نقل ملفات Dashboard
rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  web-admin/src/pages/letters/ \
  root@72.61.239.170:/var/www/html/web-admin/src/pages/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  web-admin/src/App.tsx \
  root@72.61.239.170:/var/www/html/web-admin/src/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  web-admin/src/components/layout/MainLayout.tsx \
  root@72.61.239.170:/var/www/html/web-admin/src/components/layout/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  web-admin/src/config/api.ts \
  root@72.61.239.170:/var/www/html/web-admin/src/config/

rsync -avz -e "sshpass -p 'GamalSaad35@#' ssh" \
  web-admin/src/pages/dashboard/DashboardPage.tsx \
  root@72.61.239.170:/var/www/html/web-admin/src/pages/dashboard/
```

### 2. ثم على VPS نفذ الأوامر من القسم السابق

---

## التحقق من النجاح:

### على VPS:
```bash
# التحقق من Backend
curl http://localhost:3000/api/letters/pending/all

# يجب أن ترى JSON response
```

### في المتصفح:
1. افتح: http://72.61.239.170/
2. يجب أن ترى رابط "الخطابات" في القائمة الجانبية
3. يجب أن ترى بطاقة "خطابات معلقة" في Dashboard

---

## إذا واجهت مشاكل:

### Backend لا يعمل:
```bash
pm2 logs backend
cd /var/www/html/backend  # أو المسار الصحيح
npm run start:prod
```

### Migration فشل:
```bash
cd /var/www/html/backend
source .env
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql
```

### Dashboard لا يظهر التحديثات:
```bash
cd /var/www/html/web-admin
npm run build
pm2 restart web-admin
```

