# 🔧 حل مشكلة "لا يوجد اتصال بالخادم"

## ✅ الحل السريع:

### الخطوة 1: تأكد أن Backend يعمل

افتح Terminal جديد واكتب:
```bash
cd ~/attendance-system/backend
npm run start:dev
```

**يجب أن ترى:**
```
🚀 Server running on http://localhost:3000
```

### الخطوة 2: تحقق من الاتصال

افتح متصفح جديد واذهب إلى:
```
http://localhost:3000/health
```

**يجب أن ترى:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### الخطوة 3: أعد تحميل Dashboard

1. افتح `http://localhost:5173`
2. إذا ظهرت رسالة خطأ، اضغط **"إعادة المحاولة"**
3. أو أعد تحميل الصفحة (F5)

---

## 🔍 إذا استمرت المشكلة:

### تحقق من:

1. **Backend يعمل؟**
   ```bash
   lsof -i :3000
   ```
   يجب أن ترى عملية Node.js

2. **Dashboard يعمل؟**
   ```bash
   lsof -i :5173
   ```
   يجب أن ترى عملية Vite

3. **PostgreSQL يعمل؟**
   ```bash
   brew services list | grep postgresql
   ```
   يجب أن ترى `started`

---

## 🚨 حلول إضافية:

### إذا كان Backend لا يعمل:

```bash
cd ~/attendance-system/backend
npm run start:dev
```

### إذا كان PostgreSQL لا يعمل:

```bash
brew services start postgresql@14
```

### إذا كان Dashboard لا يعمل:

```bash
cd ~/attendance-system/web-admin
npm run dev
```

---

## ✅ بعد إصلاح المشكلة:

1. ✅ Backend يعمل على `http://localhost:3000`
2. ✅ Dashboard يعمل على `http://localhost:5173`
3. ✅ يمكنك تسجيل الدخول بنجاح

---

**💡 نصيحة:** استخدم 3 Terminals منفصلة:
- Terminal 1: Backend
- Terminal 2: Dashboard  
- Terminal 3: لأوامر أخرى

