---
description: كيفية نشر التحديثات على VPS (72.61.239.170)
---

# نشر التحديثات على VPS

## خطوات النشر الكاملة

// turbo-all

### 1. بناء الـ Frontend
```bash
cd web-admin
npm run build
```

### 2. رفع Frontend إلى VPS
```bash
scp -r "web-admin/dist/*" root@72.61.239.170:/var/www/attendance-system/web-admin/dist/
```

### 3. تعيين الصلاحيات (مهم جداً!)
```bash
ssh root@72.61.239.170 "chmod -R 755 /var/www/attendance-system/web-admin/dist/"
```

### 4. رفع Backend (إذا لزم الأمر)
```bash
scp -r "backend/src/modules/<module-name>/*" root@72.61.239.170:/var/www/attendance-system/backend/src/modules/<module-name>/
```

### 5. بناء Backend على VPS
```bash
ssh root@72.61.239.170 "cd /var/www/attendance-system/backend && npm run build"
```

### 6. إعادة تشغيل Backend
```bash
ssh root@72.61.239.170 "pm2 restart 0"
```

---

## ملاحظات مهمة

> ⚠️ **تأكد دائماً من:**
> - رفع مجلد `dist` بالكامل
> - تشغيل `chmod -R 755` بعد الرفع
> - إعادة تشغيل PM2 بعد تحديث Backend

## الـ VPS URLs
- Frontend: http://72.61.239.170/
- Backend API: http://72.61.239.170:3000/api/v1/
