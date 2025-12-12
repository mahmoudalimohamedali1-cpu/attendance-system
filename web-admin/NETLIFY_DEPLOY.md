# 🚀 دليل رفع Dashboard على Netlify

## 📋 الخطوات السريعة

### 1. إعداد GitHub Repository

```bash
# تأكد أن كل الملفات موجودة
cd /Users/gamal/attendance-system
git init  # إذا لم يكن موجود
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/attendance-system.git
git push -u origin main
```

---

### 2. رفع على Netlify

#### الطريقة الأولى: من Netlify Dashboard

1. **اذهب إلى:** https://app.netlify.com
2. **اضغط:** "Add new site" → "Import an existing project"
3. **اختر:** GitHub
4. **اختر Repository:** attendance-system
5. **إعدادات Build:**
   ```
   Base directory: web-admin
   Build command: npm install && npm run build
   Publish directory: web-admin/dist
   ```
6. **Environment Variables:**
   ```
   VITE_API_URL=https://your-api-domain.com/api/v1
   ```
   (أو `http://localhost:3000/api/v1` للتطوير)

7. **اضغط:** "Deploy site"

---

#### الطريقة الثانية: من Terminal (Netlify CLI)

```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login

# في مجلد web-admin
cd web-admin

# ربط المشروع
netlify init

# Build محلي
npm run build

# Deploy
netlify deploy --prod
```

---

### 3. إعداد Environment Variables

في Netlify Dashboard:
1. اذهب إلى: **Site settings** → **Environment variables**
2. أضف:
   ```
   Key: VITE_API_URL
   Value: https://your-api-domain.com/api/v1
   ```
3. **Scope:** Production, Preview, Development
4. **Save**

---

### 4. إعدادات إضافية

#### Custom Domain (اختياري):
1. **Site settings** → **Domain management**
2. **Add custom domain**
3. اتبع التعليمات

#### HTTPS:
- Netlify يوفر HTTPS تلقائياً ✅

---

## ✅ Checklist

- [ ] GitHub repository جاهز
- [ ] `netlify.toml` موجود
- [ ] `_redirects` موجود
- [ ] Environment Variables set
- [ ] Build successful
- [ ] Site deployed

---

## 🐛 حل المشاكل

### مشكلة: Build فشل
**الحل:**
```bash
cd web-admin
npm install
npm run build
# تحقق من الأخطاء
```

### مشكلة: 404 عند التنقل
**الحل:**
- تأكد من وجود `_redirects` file
- تأكد من `netlify.toml` settings

### مشكلة: API لا يعمل
**الحل:**
- تحقق من `VITE_API_URL` في Environment Variables
- تأكد من CORS في Backend

---

## 📝 ملاحظات

1. **Base directory:** `web-admin` (مهم جداً!)
2. **Build command:** `npm install && npm run build`
3. **Publish directory:** `web-admin/dist`
4. **Environment Variables:** `VITE_API_URL` مطلوب

---

## 🔗 بعد النشر

1. **افتح الموقع:** `https://your-site.netlify.app`
2. **جرب تسجيل الدخول**
3. **تحقق من الاتصال بالـ API**

---

## 🎯 مثال Environment Variables

```
VITE_API_URL=https://api.yourcompany.com/api/v1
```

أو للتطوير:
```
VITE_API_URL=http://localhost:3000/api/v1
```

---

## ✅ جاهز!

بعد اتباع الخطوات، Dashboard سيكون متاح على:
`https://your-site.netlify.app`

