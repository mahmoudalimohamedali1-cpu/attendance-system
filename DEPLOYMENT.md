# دليل النشر - Deployment Guide

## 📋 المتطلبات

### 1. Backend (NestJS)
- Node.js 18+
- PostgreSQL Database
- Python 3.9+ (لخدمة Face Recognition)

### 2. Frontend Dashboard (React/Vite)
- Node.js 18+

### 3. Mobile App (Flutter)
- Flutter SDK 3.0+
- Android Studio / Xcode

---

## 🚀 خطوات النشر

### 1. نشر Backend

#### أ. على VPS/Server:

```bash
# 1. نسخ الملفات
cd backend
npm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env وأضف:
# - DATABASE_URL
# - JWT_SECRET
# - NODE_ENV=production

# 3. إعداد قاعدة البيانات
npx prisma generate
npx prisma migrate deploy

# 4. بناء المشروع
npm run build

# 5. تشغيل الإنتاج
npm run start:prod
```

#### ب. على Railway/Render/Heroku:

1. اربط GitHub repository
2. أضف Environment Variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-dashboard-domain.com`
3. Build Command: `npm run build`
4. Start Command: `npm run start:prod`

#### ج. إعداد CORS:

في `backend/src/main.ts`، تأكد من:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'https://your-dashboard-domain.com',
  credentials: true,
  // ...
});
```

---

### 2. نشر Dashboard (Netlify/Vercel)

#### أ. على Netlify:

1. **ربط GitHub:**
   - اذهب إلى Netlify Dashboard
   - اضغط "New site from Git"
   - اختر GitHub repository
   - اختر `web-admin` folder

2. **Build Settings:**
   ```
   Base directory: web-admin
   Build command: npm run build
   Publish directory: web-admin/dist
   ```

3. **Environment Variables:**
   ```
   VITE_API_URL=https://your-api-domain.com/api/v1
   ```

4. **Deploy!**

#### ب. على Vercel:

1. **ربط GitHub:**
   ```bash
   npm i -g vercel
   cd web-admin
   vercel
   ```

2. **Environment Variables:**
   - في Vercel Dashboard → Settings → Environment Variables
   - أضف: `VITE_API_URL=https://your-api-domain.com/api/v1`

#### ج. على VPS/Server (Nginx):

```nginx
server {
    listen 80;
    server_name your-dashboard-domain.com;

    root /var/www/attendance-system/web-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### 3. نشر Mobile App

#### أ. بناء APK:

```bash
cd mobile

# تحديث API URL في app_config.dart أو استخدام dart-define
flutter build apk --release \
  --dart-define=API_URL=https://your-api-domain.com/api/v1 \
  --dart-define=FACE_URL=https://your-face-service-domain.com
```

#### ب. تحديث `app_config.dart`:

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://your-api-domain.com/api/v1',
);

static const String faceRecognitionUrl = String.fromEnvironment(
  'FACE_URL',
  defaultValue: 'https://your-face-service-domain.com',
);
```

#### ج. بناء iOS:

```bash
flutter build ios --release \
  --dart-define=API_URL=https://your-api-domain.com/api/v1
```

---

### 4. نشر Face Recognition Service (Python)

#### أ. على VPS/Server:

```bash
cd face-recognition-service

# إنشاء virtual environment
python3 -m venv venv
source venv/bin/activate

# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل مع Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

#### ب. مع Nginx (Reverse Proxy):

```nginx
server {
    listen 80;
    server_name face-api.your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### ج. على Railway/Render:

1. اربط GitHub repository
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT app:app`
4. Environment Variables:
   - `PORT=5001`

---

## 🔧 إعدادات مهمة

### 1. Environment Variables

#### Backend (.env):
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-dashboard-domain.com
PORT=3000
```

#### Dashboard (.env):
```env
VITE_API_URL=https://your-api-domain.com/api/v1
```

#### Mobile (app_config.dart):
```dart
static const String apiBaseUrl = 'https://your-api-domain.com/api/v1';
static const String faceRecognitionUrl = 'https://your-face-service-domain.com';
```

---

### 2. CORS Configuration

في `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    process.env.FRONTEND_URL || 'https://your-dashboard-domain.com',
    'https://your-dashboard-domain.com',
  ],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

### 3. Database Migration

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## ✅ Checklist قبل النشر

### Backend:
- [ ] `.env` file configured
- [ ] Database migrated
- [ ] CORS configured
- [ ] JWT_SECRET set
- [ ] PORT configured
- [ ] Health check endpoint working

### Dashboard:
- [ ] `VITE_API_URL` set correctly
- [ ] Build successful
- [ ] Environment variables configured in hosting platform

### Mobile:
- [ ] `app_config.dart` updated with production URLs
- [ ] APK built with correct API URLs
- [ ] Face Recognition service URL updated

### Face Recognition Service:
- [ ] Service running on port 5001
- [ ] Accessible from mobile devices
- [ ] Health check working

---

## 🧪 اختبار بعد النشر

### 1. Backend:
```bash
curl https://your-api-domain.com/health
```

### 2. Dashboard:
- افتح `https://your-dashboard-domain.com`
- جرب تسجيل الدخول

### 3. Mobile:
- ثبت APK على جهاز
- جرب تسجيل الدخول
- جرب تسجيل الحضور

### 4. Face Recognition:
```bash
curl https://your-face-service-domain.com/health
```

---

## 🐛 حل المشاكل

### مشكلة: CORS Error
**الحل:** تأكد من إضافة Dashboard URL في Backend CORS settings

### مشكلة: API لا يعمل
**الحل:** 
- تحقق من Environment Variables
- تحقق من Database connection
- تحقق من PORT configuration

### مشكلة: Mobile App لا يتصل بالـ API
**الحل:**
- تأكد من تحديث `app_config.dart`
- تأكد من بناء APK مع `--dart-define`
- تحقق من SSL certificate (HTTPS required)

### مشكلة: Face Recognition لا يعمل
**الحل:**
- تأكد من تشغيل Python service
- تحقق من Network connectivity
- تأكد من تحديث `faceRecognitionUrl` في Mobile

---

## 📞 الدعم

إذا واجهت مشاكل، تحقق من:
1. Logs في hosting platform
2. Browser Console (F12)
3. Mobile App logs (flutter logs)
4. Backend logs

---

## 🔐 الأمان

1. **استخدم HTTPS دائماً**
2. **لا ترفع `.env` files على GitHub**
3. **استخدم strong JWT_SECRET**
4. **فعّل Rate Limiting**
5. **استخدم Environment Variables**

---

## 📝 ملاحظات

- Dashboard يحتاج HTTPS في الإنتاج
- Mobile App يحتاج HTTPS للاتصال بالـ API
- Face Recognition Service يجب أن يكون accessible من Mobile devices
- Database يجب أن يكون accessible من Backend server

