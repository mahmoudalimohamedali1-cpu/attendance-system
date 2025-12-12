# 🚀 نشر Dashboard على Vercel

## الطريقة 1: عبر Vercel Dashboard (الأسهل) ⭐

### الخطوات:

1. **افتح Vercel Dashboard:**
   - اذهب إلى: https://vercel.com/dashboard
   - تأكد من تسجيل الدخول

2. **إضافة مشروع جديد:**
   - اضغط على "Add New Project" أو "Import Project"
   - اختر GitHub repository: `attendance-system`
   - أو ارفع المشروع مباشرة

3. **إعدادات المشروع:**
   ```
   Framework Preset: Vite
   Root Directory: web-admin
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables:**
   - اضغط على "Environment Variables"
   - أضف:
     ```
     Name: VITE_API_BASE_URL
     Value: https://your-backend-api.com/api/v1
     Environment: Production, Preview, Development (كلهم)
     ```
   - **مهم:** استخدم `VITE_API_BASE_URL` (ليس `VITE_API_URL`)

5. **Deploy:**
   - اضغط "Deploy"
   - انتظر حتى يكتمل البناء
   - ستحصل على رابط مثل: `https://attendance-system.vercel.app`

---

## الطريقة 2: عبر Vercel CLI

### الحصول على Token:

1. اذهب إلى: https://vercel.com/account/tokens
2. اضغط "Create Token"
3. اسم: `attendance-system-deploy`
4. انسخ الـ Token

### استخدام Token:

```bash
cd web-admin
vercel login --token YOUR_TOKEN_HERE
vercel link
vercel env add VITE_API_BASE_URL production
# أدخل: https://your-backend-api.com/api/v1
vercel --prod
```

---

## ✅ بعد النشر:

1. **تحقق من الـ URL:**
   - افتح الرابط الذي يعطيك Vercel
   - تأكد أن Dashboard يعمل

2. **إعداد Custom Domain (اختياري):**
   - Settings → Domains
   - أضف domain الخاص بك

3. **تحديث CORS في Backend:**
   - أضف Vercel URL إلى `ALLOWED_ORIGINS` في `.env`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
   ```

---

## 📝 ملاحظات:

- ✅ Vercel يدعم React/Vite تلقائياً
- ✅ إعادة النشر تلقائية عند push إلى GitHub
- ✅ HTTPS مجاني
- ✅ Custom Domain مجاني
- ✅ CDN عالمي سريع

---

## 🔧 استكشاف الأخطاء:

إذا واجهت مشاكل:
1. تأكد من `VITE_API_BASE_URL` موجود في Environment Variables
2. تأكد من أن Backend يدعم CORS من Vercel domain
3. تحقق من Build Logs في Vercel Dashboard

