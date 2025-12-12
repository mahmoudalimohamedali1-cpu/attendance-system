# 🚀 دليل تشغيل نظام الحضور والانصراف

## 📋 المتطلبات

### 1. البرامج المطلوبة
- **Node.js** v18+ (https://nodejs.org)
- **PostgreSQL** v14+ (https://www.postgresql.org)
- **Flutter** v3.16+ (https://flutter.dev)
- **Git** (https://git-scm.com)

### 2. التحقق من التثبيت
```bash
node --version    # يجب أن يكون 18.0.0 أو أحدث
npm --version     # يجب أن يكون 8.0.0 أو أحدث
psql --version    # يجب أن يكون 14 أو أحدث
flutter --version # يجب أن يكون 3.16 أو أحدث
```

---

## ⚙️ إعداد قاعدة البيانات

### 1. إنشاء قاعدة البيانات
```bash
# تسجيل الدخول إلى PostgreSQL
psql -U postgres

# إنشاء قاعدة البيانات
CREATE DATABASE attendance_db;

# إنشاء مستخدم (اختياري)
CREATE USER attendance_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;

# الخروج
\q
```

---

## 🔧 تشغيل Backend (NestJS)

### 1. الانتقال للمجلد
```bash
cd backend
```

### 2. تثبيت الحزم
```bash
npm install
```

### 3. إعداد ملف البيئة
```bash
# نسخ ملف البيئة النموذجي
cp .env.example .env

# تعديل الملف بإعدادات قاعدة البيانات
nano .env
```

### محتوى ملف `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/attendance_db?schema=public"

# JWT
JWT_SECRET=your_secret_key_here_make_it_long_and_random
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=another_secret_key_for_refresh_tokens
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. تشغيل Migrations
```bash
# إنشاء جداول قاعدة البيانات
npx prisma migrate dev --name init

# إدخال البيانات الأولية
npx prisma db seed
```

### 5. تشغيل السيرفر
```bash
# تشغيل في وضع التطوير
npm run start:dev

# أو تشغيل في الخلفية
npm run start:dev &
```

### ✅ التحقق من العمل
```bash
curl http://localhost:3000/
# يجب أن يظهر: {"message":"مرحباً بك في نظام الحضور والانصراف"...}
```

---

## 🌐 تشغيل Web Admin (React + Vite)

### 1. الانتقال للمجلد
```bash
cd web-admin
```

### 2. تثبيت الحزم
```bash
npm install
```

### 3. إعداد ملف البيئة
```bash
cp .env.example .env
```

### محتوى ملف `.env`:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=نظام الحضور والانصراف
```

### 4. تشغيل السيرفر
```bash
npm run dev
```

### ✅ فتح في المتصفح
```
http://localhost:5173
```

### حسابات الدخول التجريبية:
| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| مدير النظام | admin@company.com | admin123 |
| مدير | manager@company.com | manager123 |
| موظف | employee1@company.com | employee123 |

---

## 📱 تشغيل تطبيق الموبايل (Flutter)

### 1. الانتقال للمجلد
```bash
cd mobile
```

### 2. تحميل الحزم
```bash
flutter pub get
```

### 3. تعديل عنوان API

#### للمحاكي Android:
```dart
// في lib/core/config/app_config.dart
static const String apiBaseUrl = 'http://10.0.2.2:3000/api/v1';
```

#### لمحاكي iOS:
```dart
static const String apiBaseUrl = 'http://localhost:3000/api/v1';
```

#### لجهاز حقيقي:
```dart
// استخدم عنوان IP الخاص بجهاز الكمبيوتر
static const String apiBaseUrl = 'http://192.168.1.100:3000/api/v1';
```

### 4. تشغيل التطبيق
```bash
# تشغيل على المحاكي
flutter run

# أو على جهاز محدد
flutter run -d <device_id>

# عرض الأجهزة المتاحة
flutter devices
```

---

## 🗂️ هيكل المشروع

```
attendance-system/
├── backend/              # خادم NestJS
│   ├── src/
│   │   ├── modules/      # الوحدات (auth, users, attendance, etc.)
│   │   ├── common/       # الأدوات المشتركة
│   │   └── main.ts       # نقطة البداية
│   ├── prisma/
│   │   ├── schema.prisma # تعريف قاعدة البيانات
│   │   └── seed.ts       # البيانات الأولية
│   └── .env              # إعدادات البيئة
│
├── web-admin/            # لوحة التحكم React
│   ├── src/
│   │   ├── pages/        # الصفحات
│   │   ├── components/   # المكونات
│   │   ├── services/     # خدمات API
│   │   └── store/        # إدارة الحالة
│   └── .env              # إعدادات البيئة
│
├── mobile/               # تطبيق Flutter
│   ├── lib/
│   │   ├── core/         # الأدوات الأساسية
│   │   ├── features/     # الميزات
│   │   └── main.dart     # نقطة البداية
│   └── pubspec.yaml      # الحزم
│
└── README.md
```

---

## 🔗 API Endpoints الرئيسية

### Authentication
- `POST /api/v1/auth/login` - تسجيل الدخول
- `POST /api/v1/auth/refresh` - تجديد التوكن
- `POST /api/v1/auth/logout` - تسجيل الخروج

### Users
- `GET /api/v1/users` - قائمة المستخدمين
- `POST /api/v1/users` - إضافة مستخدم
- `GET /api/v1/users/me` - الملف الشخصي

### Attendance
- `POST /api/v1/attendance/check-in` - تسجيل الحضور
- `POST /api/v1/attendance/check-out` - تسجيل الانصراف
- `GET /api/v1/attendance/today` - حضور اليوم
- `GET /api/v1/attendance/history` - السجل

### Branches
- `GET /api/v1/branches` - قائمة الفروع
- `POST /api/v1/branches` - إضافة فرع
- `GET /api/v1/branches/departments/all` - قائمة الأقسام

### Reports
- `GET /api/v1/reports/dashboard` - إحصائيات لوحة التحكم
- `GET /api/v1/reports/attendance` - تقرير الحضور

---

## 🔒 الأمان

### JWT Tokens
- Access Token: صلاحية 1 ساعة
- Refresh Token: صلاحية 7 أيام
- تخزين آمن في SecureStorage (Mobile) و localStorage (Web)

### صلاحيات المستخدمين
- **ADMIN**: كل الصلاحيات
- **MANAGER**: إدارة فريقه + التقارير
- **EMPLOYEE**: الحضور + طلب الإجازات

---

## ❓ حل المشاكل الشائعة

### 1. خطأ في الاتصال بقاعدة البيانات
```bash
# تأكد من تشغيل PostgreSQL
sudo systemctl start postgresql

# أو على macOS
brew services start postgresql
```

### 2. خطأ CORS
- تأكد من أن `FRONTEND_URL` في `.env` يطابق عنوان الفرونت إند

### 3. لا يمكن الوصول للـ API من الموبايل
- استخدم عنوان IP الخاص بالكمبيوتر وليس `localhost`
- تأكد من أن الكمبيوتر والموبايل على نفس الشبكة

### 4. إعادة تعيين قاعدة البيانات
```bash
cd backend
npx prisma migrate reset
npx prisma db seed
```

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
- فتح Issue على GitHub
- التواصل عبر البريد الإلكتروني

---

**تم إنشاء النظام بواسطة نظام الذكاء الاصطناعي** 🤖

