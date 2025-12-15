# 🚀 نشر نظام الخطابات على VPS

## المشكلة:
نظام الخطابات موجود محلياً لكن لا يظهر في Dashboard على VPS

## الحل: رفع التحديثات إلى VPS

---

## 📋 الخطوات:

### 1️⃣ رفع الكود إلى Git (إذا لم يكن موجوداً)

```bash
# التأكد من أن كل التغييرات محفوظة
cd /Users/gamal/attendance-system

# إضافة الملفات الجديدة
git add .

# عمل commit
git commit -m "Add letters feature - نظام الخطابات"

# رفع إلى GitHub/GitLab
git push origin main
```

---

### 2️⃣ الاتصال بـ VPS

```bash
ssh user@your-vps-ip
# أو
ssh root@your-vps-ip
```

---

### 3️⃣ تحديث الكود على VPS

```bash
# الانتقال إلى مجلد المشروع
cd /path/to/attendance-system

# سحب التحديثات من Git
git pull origin main

# أو إذا لم يكن مربوط بـ Git، انسخ الملفات يدوياً:
# (استخدم scp أو rsync من جهازك المحلي)
```

---

### 4️⃣ تحديث Backend

```bash
cd backend

# تثبيت الحزم الجديدة (إذا كان هناك حزم جديدة)
npm install

# بناء المشروع
npm run build

# أو إذا كان يستخدم TypeScript مباشرة
npx tsc
```

---

### 5️⃣ تطبيق Migration على قاعدة البيانات

```bash
cd backend

# الطريقة الأولى: استخدام Prisma Migrate
npx prisma migrate deploy

# أو الطريقة الثانية: تطبيق SQL مباشرة
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql

# أو استخدام السكريبت
./apply-letters-migration.sh
```

---

### 6️⃣ إعادة بناء Prisma Client

```bash
cd backend
npx prisma generate
```

---

### 7️⃣ إعادة تشغيل Backend

#### إذا كان يستخدم PM2:
```bash
pm2 restart backend
# أو
pm2 restart all
```

#### إذا كان يستخدم systemd:
```bash
sudo systemctl restart attendance-backend
# أو
sudo systemctl restart backend
```

#### إذا كان يدوياً:
```bash
# أوقف العملية الحالية (Ctrl+C)
# ثم شغلها مرة أخرى
npm run start:prod
```

---

### 8️⃣ تحديث Dashboard (Web Admin)

```bash
cd /path/to/attendance-system/web-admin

# سحب التحديثات (إذا كان مربوط بـ Git)
git pull origin main

# تثبيت الحزم الجديدة
npm install

# بناء المشروع
npm run build

# إذا كان يستخدم PM2:
pm2 restart web-admin

# أو إذا كان يستخدم nginx/apache:
# فقط أعد تحميل الصفحة في المتصفح
```

---

## ✅ التحقق من النجاح:

### 1. التحقق من Backend:
```bash
# على VPS
curl http://localhost:3000/api/letters/pending/all

# يجب أن ترى JSON response (حتى لو كان فارغاً)
```

### 2. التحقق من Dashboard:
- افتح Dashboard في المتصفح
- يجب أن ترى رابط "الخطابات" في القائمة الجانبية
- يجب أن ترى بطاقة "خطابات معلقة" في Dashboard

### 3. التحقق من قاعدة البيانات:
```bash
# على VPS
psql $DATABASE_URL -c "\d letter_requests"
# يجب أن ترى جدول letter_requests
```

---

## 🔍 حل المشاكل:

### المشكلة: Backend لا يعمل بعد إعادة التشغيل

```bash
# تحقق من الـ logs
pm2 logs backend
# أو
journalctl -u attendance-backend -f

# تحقق من الأخطاء
cd backend
npm run start:prod
```

### المشكلة: Migration فشل

```bash
# تحقق من وجود الجدول
psql $DATABASE_URL -c "\d letter_requests"

# إذا لم يكن موجوداً، طبق Migration يدوياً
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql
```

### المشكلة: Dashboard لا يظهر الخطابات

1. تحقق من أن Backend يعمل: `curl http://localhost:3000/health`
2. تحقق من console المتصفح (F12) للأخطاء
3. أعد بناء Dashboard: `npm run build`
4. امسح cache المتصفح (Ctrl+Shift+R)

---

## 📝 ملاحظات مهمة:

1. **تأكد من عمل Backup** قبل تطبيق Migration
2. **تأكد من أن DATABASE_URL صحيح** في `.env`
3. **تأكد من أن PORT صحيح** (عادة 3000)
4. **تحقق من الـ logs** بعد إعادة التشغيل

---

## 🎯 ملخص سريع:

```bash
# على جهازك المحلي
git add .
git commit -m "Add letters feature"
git push origin main

# على VPS
ssh user@vps-ip
cd /path/to/attendance-system
git pull origin main
cd backend
npm install
npm run build
npx prisma migrate deploy
npx prisma generate
pm2 restart backend

cd ../web-admin
npm install
npm run build
pm2 restart web-admin
```

---

**✅ بعد هذه الخطوات، يجب أن يظهر نظام الخطابات في Dashboard!**

