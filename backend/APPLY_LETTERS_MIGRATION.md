# تطبيق Migration للخطابات على VPS

## الخطوات:

### 1. الاتصال بـ VPS
```bash
ssh user@your-vps-ip
```

### 2. الانتقال إلى مجلد المشروع
```bash
cd /path/to/attendance-system/backend
```

### 3. تطبيق Migration

#### الطريقة الأولى: استخدام Prisma Migrate (موصى بها)
```bash
# التأكد من أن DATABASE_URL صحيح في .env
npx prisma migrate deploy
```

#### الطريقة الثانية: تطبيق SQL مباشرة
```bash
# نسخ ملف Migration
cat prisma/migrations/apply_letters_migration.sql

# تطبيقه على قاعدة البيانات
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql

# أو إذا كان لديك DATABASE_URL في .env
source .env
psql $DATABASE_URL -f prisma/migrations/apply_letters_migration.sql
```

#### الطريقة الثالثة: استخدام psql مباشرة
```bash
# الاتصال بقاعدة البيانات
psql -h your-db-host -U your-db-user -d your-db-name

# ثم نسخ ولصق محتوى الملف
\i prisma/migrations/apply_letters_migration.sql
```

### 4. التحقق من نجاح Migration
```bash
# التحقق من وجود الجداول
psql $DATABASE_URL -c "\d letter_requests"

# التحقق من الـ Enums
psql $DATABASE_URL -c "\dT+ LetterType"
psql $DATABASE_URL -c "\dT+ LetterStatus"
```

### 5. إعادة تشغيل Backend
```bash
# إذا كان يستخدم PM2
pm2 restart backend

# أو إذا كان يستخدم systemd
sudo systemctl restart attendance-backend

# أو يدوياً
npm run start:prod
```

## ملاحظات:

- الملف `apply_letters_migration.sql` آمن للتطبيق حتى لو تم تطبيقه مسبقاً (يستخدم IF NOT EXISTS)
- تأكد من عمل backup لقاعدة البيانات قبل التطبيق
- بعد التطبيق، تأكد من أن Backend يعمل بشكل صحيح

## التحقق من النجاح:

بعد تطبيق Migration، يجب أن ترى:
- جدول `letter_requests` موجود
- Enums `LetterType` و `LetterStatus` موجودة
- الـ indexes تم إنشاؤها
- الـ foreign keys تم إضافتها

