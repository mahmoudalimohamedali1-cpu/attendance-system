# 🚀 نشر Dashboard على Vercel - دليل سريع

## ✅ الخطوات (5 دقائق):

### 1️⃣ ربط المشروع من Vercel Dashboard:

1. **افتح Vercel:**
   - اذهب إلى: https://vercel.com/dashboard
   - تأكد من تسجيل الدخول

2. **إضافة مشروع جديد:**
   - اضغط على **"Add New Project"** أو **"Import Project"**
   - اختر GitHub repository: `attendance-system`
   - أو اضغط **"Import Git Repository"** واختر الـ repo

3. **إعدادات المشروع:**
   ```
   Framework Preset: Vite (سيتم اكتشافه تلقائياً)
   Root Directory: web-admin
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables (مهم جداً!):**
   - قبل الضغط على Deploy، اضغط على **"Environment Variables"**
   - أضف المتغير التالي:
     ```
     Name: VITE_API_BASE_URL
     Value: https://your-backend-api.com/api/v1
     Environment: Production, Preview, Development (اختر كلهم)
     ```
   - **مثال:** إذا كان Backend على `https://api.example.com/api/v1`
   - اضغط **"Save"**

5. **Deploy:**
   - اضغط **"Deploy"**
   - انتظر 2-3 دقائق حتى يكتمل البناء
   - ✅ ستحصل على رابط مثل: `https://attendance-system.vercel.app`

---

## 🔗 بعد النشر:

### 2️⃣ تحديث CORS في Backend:

أضف Vercel URL إلى `ALLOWED_ORIGINS` في ملف `.env` في Backend:

```env
ALLOWED_ORIGINS=https://attendance-system.vercel.app,https://your-custom-domain.com
```

أو في `main.ts`:
```typescript
origin: [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://attendance-system.vercel.app', // أضف Vercel URL هنا
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
]
```

---

## 🌐 إعداد Custom Domain (اختياري):

1. في Vercel Dashboard → **Settings** → **Domains**
2. أضف domain الخاص بك (مثل: `dashboard.yourcompany.com`)
3. اتبع التعليمات لإضافة DNS records
4. انتظر حتى يتم التحقق (عادة 5-10 دقائق)

---

## 🔄 إعادة النشر التلقائي:

- ✅ Vercel يعيد النشر تلقائياً عند push إلى `main` branch
- ✅ لا حاجة لإعدادات إضافية

---

## 🐛 استكشاف الأخطاء:

### المشكلة: Dashboard لا يتصل بالـ Backend
**الحل:**
1. تأكد من `VITE_API_BASE_URL` موجود في Environment Variables
2. تأكد من أن Backend يدعم CORS من Vercel domain
3. تحقق من Build Logs في Vercel Dashboard

### المشكلة: Build فشل
**الحل:**
1. افتح Build Logs في Vercel Dashboard
2. تحقق من الأخطاء
3. تأكد من أن `Root Directory` = `web-admin`

---

## 📱 اختبار:

بعد النشر:
1. افتح الرابط الذي يعطيك Vercel
2. جرب تسجيل الدخول
3. تأكد أن Dashboard يعمل بشكل صحيح

---

## ✅ كل شيء جاهز!

المشروع الآن على Vercel ويعمل! 🎉

