# 🔧 حل مشكلة "Not Found" في Railway

## ❌ المشكلة:
```
Not Found - The train has not arrived at the station.
```

هذا يعني أن Backend لم يتم نشره بشكل صحيح.

---

## 🔍 الخطوة 1: فحص Logs

### 1.1 في Railway Dashboard:
1. اضغط على **Backend Service**
2. اذهب إلى **"Deployments"** tab
3. اضغط على آخر deployment
4. اذهب إلى **"Logs"** tab
5. **اقرأ الأخطاء** - هذا مهم جداً!

### 1.2 ما الذي تبحث عنه:
- ❌ Build errors
- ❌ Database connection errors
- ❌ Missing dependencies
- ❌ Port errors
- ❌ Start command errors

---

## ✅ الخطوة 2: التحقق من الإعدادات

### 2.1 Root Directory:
1. Settings → Source
2. تأكد من: **Root Directory = `backend`**

### 2.2 Build Command:
1. Settings → Build
2. تأكد من: **Custom Build Command** مفعّل
3. Build Command:
   ```
   npm install && npm run build && npx prisma generate
   ```

### 2.3 Start Command:
1. Settings → Deploy
2. تأكد من: **Custom Start Command** مفعّل
3. Start Command:
   ```
   npm run start:prod
   ```

### 2.4 Environment Variables:
1. Variables tab
2. تأكد من وجود:
   - ✅ `DATABASE_URL` (من Database service)
   - ✅ `NODE_ENV` = `production`
   - ✅ `PORT` (عادة Railway يضيفه تلقائياً)

---

## 🔧 الخطوة 3: حلول شائعة

### المشكلة 1: Build فشل
**الحل:**
1. افتح Logs
2. إذا رأيت: `Cannot find module` أو `Missing dependencies`
   - تأكد من Build Command يحتوي على `npm install`
3. إذا رأيت: `Prisma Client not generated`
   - تأكد من Build Command يحتوي على `npx prisma generate`

### المشكلة 2: Database connection failed
**الحل:**
1. تأكد من Database service يعمل (Running)
2. تأكد من `DATABASE_URL` موجود في Variables
3. تأكد من نسخ `DATABASE_URL` من Database service (ليس من Backend)

### المشكلة 3: Port error
**الحل:**
1. في Settings → Networking
2. تأكد من Port = `3000` أو اتركه فارغاً
3. Railway عادة يحدد PORT تلقائياً

### المشكلة 4: Start command error
**الحل:**
1. تأكد من Start Command = `npm run start:prod`
2. تأكد من أن `dist/main.js` موجود (يتم إنشاؤه بعد build)
3. إذا لم يكن موجود، Build فشل - راجع Build Logs

---

## 🚀 الخطوة 4: إعادة النشر

### 4.1 بعد إصلاح المشاكل:
1. في Backend Service → Deployments
2. اضغط **"Redeploy"** أو **"Deploy"**
3. انتظر حتى يكتمل
4. تحقق من Logs للتأكد من النجاح

### 4.2 التحقق من النشر:
1. بعد Redeploy، انتظر حتى ترى **"Running"** ✅
2. افتح **Settings → Networking**
3. اضغط **"Generate Domain"** إذا لم يكن موجود
4. جرب الرابط مرة أخرى

---

## 📋 Checklist سريع:

- [ ] Root Directory = `backend` ✅
- [ ] Build Command = `npm install && npm run build && npx prisma generate` ✅
- [ ] Start Command = `npm run start:prod` ✅
- [ ] `DATABASE_URL` موجود في Variables ✅
- [ ] `NODE_ENV` = `production` ✅
- [ ] Database service يعمل (Running) ✅
- [ ] آخر deployment = "Running" ✅
- [ ] لا توجد أخطاء في Logs ✅

---

## 🆘 إذا لم يعمل بعد:

### 1. افحص Logs بالتفصيل:
- افتح Logs
- ابحث عن أول خطأ
- اقرأ رسالة الخطأ كاملة
- ابحث عن الحل بناءً على رسالة الخطأ

### 2. جرب إعادة إنشاء Service:
1. احذف Backend Service
2. أنشئ Service جديد
3. اتبع الخطوات من البداية

### 3. تحقق من GitHub Repository:
- تأكد من أن `backend/` folder موجود
- تأكد من أن `package.json` موجود في `backend/`
- تأكد من أن `src/main.ts` موجود

---

**ابدأ بفحص Logs - هذا سيعطيك السبب الحقيقي للمشكلة! 🔍**

