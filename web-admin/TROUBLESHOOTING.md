# 🔧 دليل حل المشاكل - لوحة التحكم

## ❌ مشكلة: "لا يوجد اتصال بالخادم"

### ✅ الحلول:

#### 1. تأكد أن Backend يعمل:

```bash
# افتح Terminal جديد
cd ~/attendance-system/backend
npm run start:dev
```

يجب أن ترى:
```
🚀 Server running on http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

#### 2. تحقق من الاتصال:

افتح متصفح جديد واذهب إلى:
```
http://localhost:3000/health
```

يجب أن ترى:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

#### 3. تحقق من CORS:

افتح Developer Tools (F12) → Console
إذا رأيت أخطاء CORS، تأكد من:
- Backend يعمل على `http://localhost:3000`
- Dashboard يعمل على `http://localhost:5173`
- ملف `.env` في `web-admin` يحتوي على:
  ```
  VITE_API_BASE_URL=http://localhost:3000/api/v1
  ```

#### 4. أعد تشغيل Dashboard:

```bash
cd ~/attendance-system/web-admin
# أوقف الخادم (Ctrl+C)
npm run dev
```

#### 5. تحقق من المنافذ:

```bash
# تحقق من Backend
lsof -i :3000

# تحقق من Dashboard
lsof -i :5173
```

---

## 🔍 مشاكل أخرى شائعة:

### المشكلة: "Network Error"
**الحل:** 
- تأكد أن Backend يعمل
- تحقق من Firewall
- جرب `http://127.0.0.1:3000` بدلاً من `localhost`

### المشكلة: "CORS Error"
**الحل:**
- تأكد من إعدادات CORS في `backend/src/main.ts`
- أعد تشغيل Backend بعد التعديل

### المشكلة: "401 Unauthorized"
**الحل:**
- Token منتهي الصلاحية
- سجل دخول مرة أخرى
- تحقق من أن Token يتم إرساله في Header

### المشكلة: "500 Internal Server Error"
**الحل:**
- تحقق من Backend logs
- تأكد من أن قاعدة البيانات تعمل
- تحقق من `.env` في Backend

---

## 🚀 تشغيل النظام بالكامل:

### Terminal 1: Backend
```bash
cd ~/attendance-system/backend
npm run start:dev
```

### Terminal 2: Dashboard
```bash
cd ~/attendance-system/web-admin
npm run dev
```

### Terminal 3: PostgreSQL (إذا توقف)
```bash
brew services start postgresql@14
```

---

## ✅ التحقق من أن كل شيء يعمل:

1. **Backend Health:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Backend API:**
   ```bash
   curl http://localhost:3000/api/v1/auth/login \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@company.com","password":"admin123"}'
   ```

3. **Dashboard:**
   - افتح `http://localhost:5173`
   - يجب أن ترى صفحة تسجيل الدخول

---

## 📞 إذا استمرت المشكلة:

1. تحقق من Logs:
   ```bash
   # Backend logs
   tail -f /tmp/backend.log
   
   # أو في Terminal الذي يشغل Backend
   ```

2. تحقق من Console في المتصفح (F12)

3. تحقق من Network tab في Developer Tools

4. تأكد من:
   - ✅ PostgreSQL يعمل
   - ✅ Backend يعمل على Port 3000
   - ✅ Dashboard يعمل على Port 5173
   - ✅ لا توجد أخطاء في Console

---

**💡 نصيحة:** استخدم صفحة Health Check في Dashboard - ستظهر لك حالة الاتصال تلقائياً!

