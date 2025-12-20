# 🚀 نشر Backend على Vercel

## ⚠️ ملاحظة مهمة:
Vercel يدعم Node.js لكن يحتاج إعدادات خاصة للـ NestJS. الأفضل استخدام Railway أو Render للـ Backend.

## البديل الأفضل: Railway (مجاني وسهل)

### خطوات نشر Backend على Railway:

1. **سجل دخول:**
   - اذهب: https://railway.app
   - سجل دخول بـ GitHub

2. **إنشاء مشروع جديد:**
   - New Project → Deploy from GitHub
   - اختر repository: `attendance-system`

3. **إعدادات المشروع:**
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

4. **Environment Variables:**
   - `DATABASE_URL` - رابط قاعدة البيانات
   - `PORT` - سيتم تعيينه تلقائياً
   - `NODE_ENV=production`
   - `FRONTEND_URL` - رابط Dashboard على Vercel
   - `ALLOWED_ORIGINS` - رابط Dashboard على Vercel

5. **Database:**
   - اضغط "New" → "Database" → "PostgreSQL"
   - Railway سيعطيك `DATABASE_URL` تلقائياً

6. **Deploy:**
   - Railway سينشر تلقائياً
   - ستحصل على رابط مثل: `https://attendance-system-backend.up.railway.app`

7. **بعد النشر:**
   - استخدم هذا الرابط في Dashboard: `https://attendance-system-backend.up.railway.app/api/v1`

