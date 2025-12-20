# 🚀 DigitalOcean App Platform - دليل خطوة بخطوة

## 📋 ما ستحصل عليه:
- ✅ Backend (NestJS) - $12/شهر
- ✅ Dashboard (React) - مجاني (مع Backend)
- ✅ Database (PostgreSQL) - $7/شهر
- ✅ **Total: ~$19/شهر**

---

## 🔑 الخطوة 1: إنشاء حساب DigitalOcean

1. اذهب: https://www.digitalocean.com
2. اضغط **"Sign Up"**
3. سجل بـ GitHub أو Email
4. أضف بطاقة (مطلوب للتفعيل)
5. ستحصل على **$200 رصيد مجاني** لأول 60 يوم!

---

## 🚀 الخطوة 2: إنشاء App

1. في Dashboard، اضغط **"Create"** (الزر الأخضر في الأعلى)
2. اختر **"Apps"**
3. ستفتح صفحة "Create App"

---

## 🔗 الخطوة 3: ربط GitHub

1. اختر **"GitHub"** كـ Source
2. إذا لم يكن GitHub مربوط:
   - اضغط **"Connect to GitHub"** أو **"Link GitHub Account"**
   - وافق على الصلاحيات في GitHub
   - اختر **"All repositories"** أو اختر `attendance-system` فقط
   - اضغط **"Install & Authorize"**

3. بعد الربط:
   - اختر Repository: **`attendance-system`**
   - Branch: **`main`**
   - اضغط **"Next"**

---

## ⚠️ الخطوة 4: حل مشكلة "No components detected"

إذا ظهرت رسالة **"No components detected"**:

### 4.1 إضافة Backend Service:

1. اضغط **"+ Add Resource"** أو **"Edit"**
2. اختر **"Detect from source code"** أو **"Create Resource"**
3. اختر **"Service"** → **"Web Service"**
4. املأ الحقول:

| الحقل | القيمة |
|-------|--------|
| **Name** | `backend` |
| **Source Directory** | `backend` |
| **Build Command** | `npm install && npm run build && npx prisma generate` |
| **Run Command** | `npm run start:prod` |
| **HTTP Port** | `3000` |
| **Instance Size** | Basic ($12/شهر) |

5. **Environment Variables:**
   - اضغط **"Edit"** بجانب Environment Variables
   - اضغط **"+ Add Variable"**
   - أضف:
     - **Key:** `NODE_ENV` → **Value:** `production`
   
6. اضغط **"Save"**

---

### 4.2 إضافة Database:

1. اضغط **"+ Add Resource"** مرة أخرى
2. اختر **"Database"**
3. اختر **"PostgreSQL"** (ليس MySQL)
4. إعدادات:

| الحقل | القيمة |
|-------|--------|
| **Name** | `db` |
| **Database Engine** | PostgreSQL |
| **Version** | 16 (أو أحدث) |
| **Plan** | Starter ($7/شهر) |

5. اضغط **"Create and Attach"** أو **"Save"**

**مهم:** DigitalOcean سيربط Database مع Backend تلقائياً وسيضيف `DATABASE_URL`!

---

### 4.3 إضافة Dashboard (Static Site):

1. اضغط **"+ Add Resource"** مرة أخرى
2. اختر **"Static Site"**
3. املأ الحقول:

| الحقل | القيمة |
|-------|--------|
| **Name** | `dashboard` |
| **Source Directory** | `web-admin` |
| **Build Command** | `npm install && npm run build` |
| **Output Directory** | `dist` |

4. **Environment Variables:**
   - اضغط **"Edit"** بجانب Environment Variables
   - اضغط **"+ Add Variable"**
   - أضف:
     - **Key:** `VITE_API_BASE_URL`
     - **Value:** `${backend.PUBLIC_URL}/api/v1`
     
   **ملاحظة:** `${backend.PUBLIC_URL}` هو متغير DigitalOcean يشير إلى Backend URL تلقائياً

5. اضغط **"Save"**

---

## 🔧 الخطوة 5: مراجعة وتأكيد

### 5.1 التحقق من Components:

يجب أن ترى 3 components:
- ✅ **backend** (Web Service)
- ✅ **db** (PostgreSQL Database)
- ✅ **dashboard** (Static Site)

### 5.2 التحقق من Environment Variables:

في **backend** → Environment Variables:
- ✅ `NODE_ENV` = `production`
- ✅ `DATABASE_URL` = (سيتم إضافته تلقائياً من db)

في **dashboard** → Environment Variables:
- ✅ `VITE_API_BASE_URL` = `${backend.PUBLIC_URL}/api/v1`

---

## 💰 الخطوة 6: اختيار Plan والدفع

1. اضغط **"Next"**
2. ستظهر صفحة **"Resources"**:
   - **App Platform:** Basic ($12/شهر)
   - **Database:** Starter ($7/شهر)
   - **Total:** ~$19/شهر

3. اضغط **"Next"**

4. **Info:**
   - **App Name:** `attendance-system` (أو أي اسم)
   - **Region:** Frankfurt (أو الأقرب لك)

5. اضغط **"Create Resources"**

---

## ⏳ الخطوة 7: انتظار Deploy

1. DigitalOcean سيبدأ Building
2. سترى:
   - **Building** → جاري البناء
   - **Deploying** → جاري النشر
   - **Active** ✅ → تم بنجاح!

3. **الوقت المتوقع:** 5-10 دقائق

4. **إذا فشل:**
   - اضغط على Component → **"Runtime Logs"** أو **"Build Logs"**
   - اقرأ رسالة الخطأ

---

## 🔗 الخطوة 8: الحصول على URLs

بعد Deploy الناجح:

1. في App Dashboard، ستجد:
   - **Backend URL:** `https://backend-xxxxx.ondigitalocean.app`
   - **Dashboard URL:** `https://dashboard-xxxxx.ondigitalocean.app`

2. **اختبار Backend:**
   - افتح: `https://backend-xxxxx.ondigitalocean.app/health`
   - يجب أن ترى: `{"status":"ok",...}`

3. **اختبار Dashboard:**
   - افتح: `https://dashboard-xxxxx.ondigitalocean.app`
   - يجب أن تفتح صفحة Login

---

## 🔧 الخطوة 9: تحديث CORS (إذا لزم)

إذا واجهت مشاكل CORS:

1. اذهب إلى **backend** → **Settings** → **Environment Variables**
2. أضف:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://dashboard-xxxxx.ondigitalocean.app` (استخدم URL الفعلي)
   
3. أضف أيضاً:
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** `https://dashboard-xxxxx.ondigitalocean.app`

4. DigitalOcean سيعيد النشر تلقائياً

---

## 🌐 الخطوة 10: Custom Domain (اختياري)

### 10.1 إضافة Domain:
1. في App Dashboard → **Settings** → **Domains**
2. اضغط **"Add Domain"**
3. أدخل domain (مثل: `dashboard.yourcompany.com`)
4. اضغط **"Add Domain"**

### 10.2 إعداد DNS:
1. DigitalOcean سيعطيك DNS records
2. اذهب إلى Domain Registrar (GoDaddy, Namecheap, etc.)
3. أضف CNAME record:
   - **Name:** `dashboard` (أو `@` للـ root)
   - **Value:** `<DigitalOcean domain>`

### 10.3 انتظار:
- انتظر 5-15 دقيقة
- DigitalOcean سيضيف SSL تلقائياً

---

## ✅ النتيجة النهائية:

| المكون | URL |
|--------|-----|
| **Backend** | `https://backend-xxxxx.ondigitalocean.app` |
| **Backend API** | `https://backend-xxxxx.ondigitalocean.app/api/v1` |
| **Dashboard** | `https://dashboard-xxxxx.ondigitalocean.app` |
| **Database** | متصل تلقائياً |

---

## 💰 التكلفة الشهرية:

| المكون | السعر |
|--------|-------|
| App Platform (Basic) | $12/شهر |
| PostgreSQL (Starter) | $7/شهر |
| **Total** | **$19/شهر** |

**ملاحظة:** أول 60 يوم مجاني (رصيد $200)!

---

## 🐛 حل المشاكل الشائعة:

### Build فشل:
1. افتح Component → **"Build Logs"**
2. اقرأ رسالة الخطأ
3. تأكد من:
   - Source Directory صحيح
   - Build Command صحيح

### Database connection failed:
1. تأكد من Database متصل (Attached) مع Backend
2. DigitalOcean يضيف `DATABASE_URL` تلقائياً
3. تحقق من Build Logs

### Dashboard لا يتصل بالـ Backend:
1. تأكد من `VITE_API_BASE_URL` صحيح
2. تحقق من CORS في Backend
3. افتح Browser Console (F12) للأخطاء

---

**كل شيء في مكان واحد على DigitalOcean! 🚀**


