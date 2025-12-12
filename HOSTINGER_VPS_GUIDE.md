# 🚀 Hostinger VPS - دليل التثبيت الكامل

## 💰 التكلفة: ~$6/شهر فقط!

---

## 📋 الخطوة 1: شراء Hostinger VPS

### 1.1 اذهب إلى Hostinger:
```
https://www.hostinger.com/vps-hosting
```

### 1.2 اختر الخطة:
| الخطة | السعر | RAM | CPU | التوصية |
|-------|-------|-----|-----|---------|
| **KVM 1** | $5.99/شهر | 4GB | 1 vCPU | ✅ كافي للبداية |
| **KVM 2** | $8.99/شهر | 8GB | 2 vCPU | أفضل للـ Production |

### 1.3 إعدادات VPS:
- **Operating System:** Ubuntu 22.04 LTS
- **Location:** أقرب موقع (Europe أو Middle East)
- **Root Password:** اختر كلمة مرور قوية واحتفظ بها

### 1.4 أكمل الشراء:
- أضف للسلة
- ادفع
- انتظر 2-5 دقائق للتفعيل

---

## 🔑 الخطوة 2: الحصول على معلومات VPS

### 2.1 في لوحة تحكم Hostinger:
1. اذهب إلى **VPS** → اختر السيرفر
2. ستجد:
   - **IP Address:** (مثل 185.xxx.xxx.xxx)
   - **Root Password:** (اللي اخترته)

### 2.2 احتفظ بهذه المعلومات:
```
IP: _______________
Password: _______________
```

---

## 🌐 الخطوة 3: ربط الدومين (اختياري لكن مُوصى به)

### 3.1 إذا عندك دومين:
1. اذهب إلى DNS Settings في GoDaddy/Namecheap/etc
2. أضف A Record:
   - **Name:** `@` أو `attendance`
   - **Value:** IP الـ VPS
   - **TTL:** 3600

### 3.2 انتظر:
- 5-30 دقيقة للتفعيل

### 3.3 إذا ما عندك دومين:
- يمكنك استخدام IP مباشرة (http://185.xxx.xxx.xxx)
- أو اشتري دومين رخيص (~$10/سنة)

---

## 💻 الخطوة 4: الاتصال بالـ VPS

### على Mac/Linux:
```bash
ssh root@YOUR_VPS_IP
```

### على Windows:
1. حمّل [PuTTY](https://www.putty.org/)
2. Host: YOUR_VPS_IP
3. Port: 22
4. Username: root
5. Password: كلمة المرور

---

## 🚀 الخطوة 5: تشغيل سكريبت التثبيت

### 5.1 اتصل بالـ VPS:
```bash
ssh root@YOUR_VPS_IP
```

### 5.2 حمّل وشغّل السكريبت:
```bash
# تحميل السكريبت
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_REPO/main/setup-vps.sh

# أو انسخ محتوى setup-vps.sh يدوياً:
nano setup-vps.sh
# الصق المحتوى
# Ctrl+X → Y → Enter

# اجعله قابل للتنفيذ
chmod +x setup-vps.sh

# شغّله
./setup-vps.sh
```

### 5.3 أدخل المعلومات المطلوبة:
- **Domain:** attendance.yourdomain.com (أو IP)
- **Email:** your@email.com

### 5.4 انتظر:
- ~5-10 دقائق للتثبيت

---

## 📤 الخطوة 6: رفع الكود

### الطريقة 1: Git (الأسهل)

**على الـ VPS:**
```bash
cd /var/www/attendance-system

# إذا الريبو private:
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/attendance-system.git temp
mv temp/backend/* backend/
mv temp/web-admin/* web-admin/
rm -rf temp

# إذا الريبو public:
git clone https://github.com/YOUR_USERNAME/attendance-system.git temp
mv temp/backend/* backend/
mv temp/web-admin/* web-admin/
rm -rf temp
```

### الطريقة 2: SCP (من جهازك)

**على جهازك المحلي:**
```bash
cd /Users/gamal/attendance-system

# رفع Backend
scp -r backend/* root@YOUR_VPS_IP:/var/www/attendance-system/backend/

# رفع Dashboard
scp -r web-admin/* root@YOUR_VPS_IP:/var/www/attendance-system/web-admin/
```

### الطريقة 3: FileZilla (SFTP)
1. حمّل [FileZilla](https://filezilla-project.org/)
2. اتصل:
   - Host: YOUR_VPS_IP
   - Username: root
   - Password: كلمة المرور
   - Port: 22
3. انقل الملفات إلى `/var/www/attendance-system/`

---

## ✅ الخطوة 7: إكمال التثبيت

**على الـ VPS:**
```bash
cd /var/www/attendance-system

# تحميل سكريبت الإكمال (إذا لم يكن موجود)
curl -o complete-setup.sh https://raw.githubusercontent.com/YOUR_REPO/main/complete-setup.sh
chmod +x complete-setup.sh

# تشغيله
./complete-setup.sh
```

**سيقوم السكريبت بـ:**
1. ✅ تثبيت npm packages
2. ✅ إعداد قاعدة البيانات
3. ✅ بناء Backend و Dashboard
4. ✅ تشغيل Backend مع PM2
5. ✅ إعداد SSL (HTTPS)
6. ✅ إعادة تشغيل Nginx

---

## 🎉 الخطوة 8: اختبار النظام

### 8.1 التحقق من Backend:
```bash
# حالة PM2
pm2 status

# سجلات
pm2 logs

# اختبار Health
curl http://localhost:3000/health
```

### 8.2 التحقق من الموقع:
- افتح: `https://YOUR_DOMAIN` أو `http://YOUR_IP`
- يجب أن تظهر صفحة Login

### 8.3 إنشاء Admin User:
```bash
cd /var/www/attendance-system/backend
npx prisma db seed
```

أو يدوياً:
```bash
cd /var/www/attendance-system/backend
npx prisma studio
# سيفتح واجهة لإدارة قاعدة البيانات
```

---

## 🔧 أوامر مفيدة

### إدارة Backend (PM2):
```bash
pm2 status              # حالة التطبيق
pm2 logs                # سجلات مباشرة
pm2 restart all         # إعادة تشغيل
pm2 stop all            # إيقاف
pm2 delete all          # حذف
```

### إدارة Nginx:
```bash
systemctl status nginx   # الحالة
systemctl restart nginx  # إعادة تشغيل
systemctl reload nginx   # إعادة تحميل Config
nginx -t                 # اختبار Config
```

### إدارة PostgreSQL:
```bash
systemctl status postgresql
sudo -u postgres psql    # دخول PostgreSQL
```

### تحديث الكود:
```bash
cd /var/www/attendance-system

# Backend
cd backend
git pull  # أو scp الملفات الجديدة
npm install
npm run build
pm2 restart all

# Dashboard
cd ../web-admin
git pull
npm install
npm run build
# لا يحتاج restart - الملفات static
```

---

## 🐛 حل المشاكل

### Backend لا يعمل:
```bash
pm2 logs  # اقرأ الأخطاء
cd /var/www/attendance-system/backend
cat .env  # تحقق من الإعدادات
```

### Database connection failed:
```bash
# تحقق من PostgreSQL
systemctl status postgresql
sudo -u postgres psql -c "SELECT 1"

# تحقق من .env
grep DATABASE_URL /var/www/attendance-system/backend/.env
```

### 502 Bad Gateway:
```bash
# Backend ربما توقف
pm2 status
pm2 restart all
```

### SSL لا يعمل:
```bash
# أعد تشغيل certbot
certbot --nginx -d YOUR_DOMAIN --email YOUR_EMAIL
systemctl restart nginx
```

---

## 📊 المراقبة

### مراقبة الموارد:
```bash
htop          # استخدام CPU/RAM
df -h         # مساحة القرص
free -m       # الذاكرة
```

### مراقبة PM2:
```bash
pm2 monit     # واجهة مراقبة مباشرة
```

---

## 🔐 الأمان

### 1. تغيير SSH Port (اختياري):
```bash
nano /etc/ssh/sshd_config
# غيّر Port 22 إلى رقم آخر مثل 2222
systemctl restart sshd
```

### 2. إعداد Firewall:
```bash
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### 3. تحديثات تلقائية:
```bash
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## ✅ ملخص النتيجة

| المكون | الرابط |
|--------|--------|
| Dashboard | https://YOUR_DOMAIN |
| API | https://YOUR_DOMAIN/api/v1 |
| Health Check | https://YOUR_DOMAIN/health |

**التكلفة الشهرية:** ~$6 فقط! 🎉

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع السجلات: `pm2 logs`
2. راجع Nginx: `tail -f /var/log/nginx/error.log`
3. تواصل معي وأرسل رسالة الخطأ

