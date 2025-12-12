# ✅ إعداد GitHub Pages - بسيط جداً!

## 📋 الخطوات (دقيقة واحدة):

### 1. في GitHub Pages Settings:

**افتح:**
```
https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/pages
```

**ثم:**
1. **Source:** اختر **"GitHub Actions"**
2. **Workflow:** اختر **"Static HTML"** (من القائمة)
3. **Save**

**✅ كده كفاية!** GitHub Pages هيعمل تلقائياً!

---

### 2. إضافة Environment Variable (اختياري):

**إذا Dashboard محتاج API URL:**

1. اذهب: https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/secrets/actions
2. **New repository secret**
3. **Name:** `VITE_API_URL`
4. **Value:** `https://your-api.com/api/v1`
5. **Add secret**

---

## 🔗 Dashboard URL:

```
https://mahmoudalimohamedali1-cpu.github.io/attendance-system/
```

---

## ✅ جاهز!

بعد اختيار "Static HTML" workflow، Dashboard سيعمل تلقائياً!

**لا تحتاج تشغيل workflow يدوياً** - GitHub Pages هيعمل تلقائياً عند push! 🚀
