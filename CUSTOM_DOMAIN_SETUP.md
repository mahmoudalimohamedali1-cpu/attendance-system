# 🌐 إعداد Custom Domain لـ GitHub Pages

## 📋 الخطوات:

### 1. في GitHub Repository:

1. اذهب إلى: **Settings** → **Pages**
2. في قسم **Custom domain**:
   - أدخل اسم الـ domain (مثل: `dashboard.yourcompany.com`)
   - اضغط **Save**

### 2. إعداد DNS:

#### إذا كان Domain من Cloudflare/Namecheap/GoDaddy:

**أضف CNAME record:**
```
Type: CNAME
Name: dashboard (أو subdomain الذي تريده)
Value: mahmoudalimohamedali1-cpu.github.io
TTL: Auto (أو 3600)
```

**أو A record:**
```
Type: A
Name: @ (للـ root domain)
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

### 3. إضافة ملف CNAME (اختياري):

GitHub سينشئه تلقائياً، لكن يمكنك إضافته يدوياً:

**في repository:**
- أنشئ ملف: `web-admin/public/CNAME`
- المحتوى: `dashboard.yourcompany.com`

### 4. انتظر DNS Propagation:

- عادة 5-30 دقيقة
- يمكن التحقق من: https://dnschecker.org

### 5. تفعيل HTTPS:

- GitHub يفعل HTTPS تلقائياً بعد التحقق من DNS
- قد يستغرق 10-30 دقيقة

---

## ✅ بعد الإعداد:

Dashboard سيكون متاح على:
```
https://dashboard.yourcompany.com
```

---

## 🔗 روابط مفيدة:

- GitHub Pages Settings: https://github.com/mahmoudalimohamedali1-cpu/attendance-system/settings/pages
- DNS Checker: https://dnschecker.org
- GitHub IPs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages

---

## 📝 ملاحظات:

1. **CNAME** للـ subdomain (مثل: dashboard.example.com)
2. **A records** للـ root domain (مثل: example.com)
3. GitHub يتحقق تلقائياً من الـ domain
4. HTTPS مفعل تلقائياً بعد التحقق

