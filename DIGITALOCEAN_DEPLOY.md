# 🚀 دليل تفصيلي: نشر النظام على DigitalOcean

## 🎯 DigitalOcean App Platform - منصة واحدة لكل شيء!

---

## 📋 الخطوة 1: إنشاء حساب

### 1.1 التسجيل:
1. اذهب: https://www.digitalocean.com
2. اضغط **"Sign Up"**
3. سجل حساب جديد (بالبريد الإلكتروني أو GitHub)
4. أضف بطاقة (لن يتم خصم شيء إلا بعد الاستخدام)

### 1.2 التحقق:
- تحقق من البريد الإلكتروني
- أكمل إعداد الحساب

---

## 🚀 الخطوة 2: إنشاء App

### 2.1 بدء إنشاء App:
1. في Dashboard، اضغط **"Create"** → **"Apps"**
2. اختر **"GitHub"** (أو GitLab/Bitbucket)
3. إذا لم تكن قد ربطت GitHub:
   - اضغط **"Connect GitHub"**
   - وافق على الصلاحيات
   - اختر repositories (أو All)

### 2.2 اختيار Repository:
1. ابحث عن: `attendance-system`
2. اضغط عليه
3. اضغط **"Next"**

---

## ⚙️ الخطوة 3: إعداد Services

DigitalOcean سيكتشف المشروع تلقائياً، لكن يمكنك التعديل:

### 3.1 Backend Service:
1. DigitalOcean سيكتشف `backend/` تلقائياً
2. إذا لم يكتشفه:
   - اضغط **"Edit"** بجانب Service
   - **Source Directory:** `backend`
3. إعدادات:
   - **Type:** Web Service
   - **Build Command:** `npm install && npm run build && npx prisma generate`
   - **Run Command:** `npm run start:prod`
   - **HTTP Port:** `3000`
   - **Environment Variables:**
     - `NODE_ENV` = `production`
     - `PORT` = `3000` (أو اتركه - سيتم تعيينه تلقائياً)

### 3.2 إضافة Database:
1. اضغط **"Add Resource"** → **"Database"**
2. اختر **"PostgreSQL"**
3. إعدادات:
   - **Database Name:** `attendance_db`
   - **Plan:** 
     - **Starter:** $7/شهر (1GB RAM) - جيد للبداية
     - **Basic:** $15/شهر (1GB RAM + Backup) - موصى به
4. **مهم:** DigitalOcean سيربط Database تلقائياً مع Backend!

### 3.3 Dashboard Service:
1. اضغط **"Add Resource"** → **"Static Site"**
2. إعدادات:
   - **Source Directory:** `web-admin`
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     - `VITE_API_BASE_URL` = `https://backend-xxxxx.ondigitalocean.app/api/v1`
     - **ملاحظة:** استخدم Backend URL من DigitalOcean (سيظهر بعد النشر)

---

## 🔧 الخطوة 4: إعدادات متقدمة

### 4.1 Environment Variables للـ Backend:
بعد إضافة Database، DigitalOcean سيضيف `DATABASE_URL` تلقائياً.

يمكنك إضافة:
- `FRONTEND_URL` = (سيتم تعيينه تلقائياً بعد نشر Dashboard)
- `ALLOWED_ORIGINS` = (نفس FRONTEND_URL)

### 4.2 Health Check:
- DigitalOcean يتحقق تلقائياً من `/health` endpoint
- تأكد من أن Backend لديه `/health` route

---

## 🚀 الخطوة 5: Deploy

### 5.1 مراجعة الإعدادات:
1. راجع كل Services
2. تأكد من الإعدادات صحيحة
3. اضغط **"Next"**

### 5.2 اختيار Plan:
- اختر Plan مناسب (Basic $12/شهر موصى به)
- اضغط **"Create Resources"**

### 5.3 النشر:
- DigitalOcean يبدأ النشر تلقائياً
- انتظر حتى يكتمل (5-10 دقائق)
- ستشاهد:
  - Building...
  - Deploying...
  - Live ✅

---

## 🌐 الخطوة 6: الحصول على URLs

### 6.1 بعد النشر:
1. في App Dashboard، ستجد:
   - **Backend URL:** `https://backend-xxxxx.ondigitalocean.app`
   - **Dashboard URL:** `https://dashboard-xxxxx.ondigitalocean.app`
   - **Database:** متصل تلقائياً

### 6.2 تحديث Dashboard URL:
1. افتح Dashboard Service → Settings
2. Environment Variables
3. حدث `VITE_API_BASE_URL` = `<Backend URL>/api/v1`

---

## 🔗 الخطوة 7: Custom Domain

### 7.1 إضافة Domain:
1. في App Dashboard → Settings → Domains
2. اضغط **"Add Domain"**
3. اكتب domain الخاص بك (مثل: `dashboard.yourcompany.com`)
4. اضغط **"Add Domain"**

### 7.2 إعداد DNS:
1. DigitalOcean سيعطيك DNS records
2. اذهب إلى Domain Registrar (GoDaddy, Namecheap, etc.)
3. أضف DNS records:
   - Type: `CNAME`
   - Name: `dashboard` (أو `@` للـ root domain)
   - Value: `<DigitalOcean domain>`

### 7.3 الانتظار:
- انتظر 5-15 دقيقة حتى يتم التحقق
- DigitalOcean سيضيف SSL تلقائياً

---

## ✅ الخطوة 8: تحديث CORS

### 8.1 في Backend Service:
1. Settings → Environment Variables
2. أضف:
   - `FRONTEND_URL` = `https://dashboard-xxxxx.ondigitalocean.app`
   - `ALLOWED_ORIGINS` = `https://dashboard-xxxxx.ondigitalocean.app`

### 8.2 Redeploy:
- DigitalOcean يعيد النشر تلقائياً بعد تحديث Variables

---

## 🎉 النتيجة النهائية:

- ✅ **Backend:** `https://backend-xxxxx.ondigitalocean.app/api/v1`
- ✅ **Dashboard:** `https://dashboard-xxxxx.ondigitalocean.app`
- ✅ **Database:** متصل تلقائياً
- ✅ **Custom Domain:** متاح
- ✅ **HTTPS:** مجاني تلقائياً
- ✅ **كل شيء في مكان واحد!**

---

## 💰 التكلفة الشهرية:

- **App Platform (Basic):** $12/شهر
- **PostgreSQL (Starter):** $7/شهر
- **Total:** ~$19/شهر

أو:
- **App Platform (Basic):** $12/شهر
- **PostgreSQL (Basic):** $15/شهر (مع Backup)
- **Total:** ~$27/شهر

---

## 🐛 استكشاف الأخطاء:

### Build فشل:
1. افتح Service → Logs
2. اقرأ رسالة الخطأ
3. تأكد من Build Command صحيح

### Database connection failed:
1. تأكد من Database متصل مع Backend Service
2. DigitalOcean يضيف `DATABASE_URL` تلقائياً
3. تحقق من Logs

### Dashboard لا يتصل بالـ Backend:
1. تأكد من `VITE_API_BASE_URL` صحيح
2. تأكد من CORS في Backend
3. افتح Browser Console للأخطاء

---

**DigitalOcean App Platform - الأسهل والأفضل! 🚀**

