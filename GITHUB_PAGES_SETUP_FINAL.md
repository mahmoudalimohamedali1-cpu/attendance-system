# ✅ إعداد GitHub Pages - الخطوات النهائية

## 📋 الخطوات:

### 1. في GitHub Pages Settings:

1. اذهب إلى: https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/pages

2. **Source:** اختر **"GitHub Actions"**

3. **Workflow:** اختر **"Static HTML"** (أو "Deploy static content to Pages")

4. **Save**

### 2. إضافة Environment Variable:

1. اذهب إلى: https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/secrets/actions

2. **New repository secret**

3. **Name:** `VITE_API_URL`
   **Value:** `https://your-api-domain.com/api/v1`

4. **Add secret**

### 3. تشغيل Workflow:

1. اذهب إلى: https://github.com/mahmoudalimohamedali1-cpu/attendance-system/actions

2. اضغط على **"Deploy static content to Pages"**

3. **Run workflow** → **main** → **Run workflow**

---

## 🔗 Dashboard URL:

```
https://mahmoudalimohamedali1-cpu.github.io/attendance-system/
```

---

## ✅ بعد النشر:

Dashboard سيعمل تلقائياً على الرابط أعلاه!

---

## 📝 ملاحظات:

- Workflow موجود: `.github/workflows/static.yml`
- Build يعمل تلقائياً عند push
- HTTPS مفعل تلقائياً
