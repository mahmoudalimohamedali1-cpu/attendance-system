# 📋 خطوات إضافة مستخدم جديد - دليل سريع

## 🎯 الطريقة الأسهل: استخدام Swagger UI

### الخطوة 1: افتح Swagger UI
افتح المتصفح واذهب إلى:
```
http://localhost:3000/api/docs
```

### الخطوة 2: سجل دخول كأدمن

1. ابحث عن قسم **"auth"** في القائمة
2. اضغط على **POST /api/v1/auth/login**
3. اضغط **"Try it out"**
4. أدخل:
   ```json
   {
     "email": "admin@company.com",
     "password": "admin123"
   }
   ```
5. اضغط **"Execute"**
6. انسخ الـ `accessToken` من النتيجة

### الخطوة 3: أذن للوصول (Authorize)

1. في أعلى الصفحة، اضغط على أيقونة **🔒 Authorize**
2. في حقل **Value**، أدخل:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (انسخ الـ Token من الخطوة 2 وأضف "Bearer " قبله)
3. اضغط **"Authorize"** ثم **"Close"**

### الخطوة 4: أضف مستخدم جديد

1. ابحث عن قسم **"users"**
2. اضغط على **POST /api/v1/users**
3. اضغط **"Try it out"**
4. أدخل بيانات المستخدم:
   ```json
   {
     "email": "ahmed@company.com",
     "password": "password123",
     "firstName": "أحمد",
     "lastName": "محمد",
     "phone": "+966501234567",
     "jobTitle": "مطور برمجيات",
     "role": "EMPLOYEE",
     "status": "ACTIVE",
     "branchId": "main-branch-id",
     "departmentId": "it-dept-id"
   }
   ```
5. اضغط **"Execute"**
6. ✅ تم! المستخدم الجديد تم إضافته

---

## 🖥️ الطريقة الثانية: استخدام Terminal

### استخدام السكريبت الجاهز:

```bash
cd ~/attendance-system/backend
./add-user.sh
```

السكريبت سيسألك عن البيانات خطوة بخطوة.

### أو يدوياً:

```bash
# 1. سجل دخول واحصل على Token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

# 2. أضف مستخدم جديد
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "ahmed@company.com",
    "password": "password123",
    "firstName": "أحمد",
    "lastName": "محمد",
    "phone": "+966501234567",
    "jobTitle": "مطور برمجيات",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "branchId": "main-branch-id",
    "departmentId": "it-dept-id"
  }' | python3 -m json.tool
```

---

## 📝 معلومات مهمة:

### الأدوار (role):
- `EMPLOYEE` - موظف عادي
- `MANAGER` - مدير
- `ADMIN` - مدير النظام

### الحالات (status):
- `ACTIVE` - نشط (يمكنه تسجيل الدخول)
- `INACTIVE` - غير نشط
- `SUSPENDED` - موقوف

### معرفات الفروع والأقسام:
- **الفرع الرئيسي:** `main-branch-id`
- **قسم IT:** `it-dept-id`
- **قسم HR:** `hr-dept-id`

لرؤية جميع الفروع:
```
GET /api/v1/branches
```

---

## ✅ تحقق من إضافة المستخدم:

بعد إضافة المستخدم، يمكنك التحقق:

```bash
# احصل على Token أولاً
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

# عرض جميع المستخدمين
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

---

## 🎬 فيديو توضيحي (خطوات):

1. ✅ افتح `http://localhost:3000/api/docs`
2. ✅ ابحث عن `POST /api/v1/auth/login` → اضغط Try it out → Execute
3. ✅ انسخ `accessToken`
4. ✅ اضغط 🔒 Authorize → أدخل `Bearer [TOKEN]` → Authorize
5. ✅ ابحث عن `POST /api/v1/users` → اضغط Try it out
6. ✅ أدخل بيانات المستخدم → Execute
7. ✅ تم! 🎉

