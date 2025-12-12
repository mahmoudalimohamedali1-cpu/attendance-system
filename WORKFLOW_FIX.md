# 🔧 حل مشكلة Workflow غير ظاهر

## المشكلة:
Workflow "Deploy to GitHub Pages" لا يظهر في GitHub Actions

## الحل:

### 1. تحقق من المسار:
الـ workflow يجب أن يكون في:
```
.github/workflows/pages.yml
```

وليس في:
```
attendance-system/.github/workflows/
```

### 2. إذا كان في المسار الخاطئ:

**افتح هذا الرابط مباشرة:**
```
https://github.com/mahmoudalimohamedali1-cpu/qr-code-generator/actions/workflows/pages.yml
```

### 3. أو استخدم هذا الرابط المباشر:
```
https://github.com/mahmoudalimohamedali1-cpu/qr-code-generator/actions/new
```

ثم اختر: **"Deploy to GitHub Pages"** workflow

### 4. طريقة بديلة - Trigger من Push:

بما أن الـ workflow يعمل على `push` تلقائياً، يمكنك:

```bash
git commit --allow-empty -m "Trigger workflow"
git push
```

هذا سيبدأ الـ workflow تلقائياً!

---

## ✅ تم إضافة:
- `.github/workflows/pages.yml` ✅
- `.github/workflows/deploy.yml` ✅

---

## 🔗 روابط مباشرة:

- Actions: https://github.com/mahmoudalimohamedali1-cpu/qr-code-generator/actions
- Pages Settings: https://github.com/mahmoudalimohamedali1-cpu/qr-code-generator/settings/pages
- Secrets: https://github.com/mahmoudalimohamedali1-cpu/qr-code-generator/settings/secrets/actions
