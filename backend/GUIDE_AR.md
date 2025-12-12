# دليل استخدام النظام - خطوات إضافة مستخدم جديد

## الخطوة 1: تسجيل الدخول كأدمن

### الطريقة الأولى: استخدام Swagger UI (الأسهل)

1. افتح المتصفح واذهب إلى:
   ```
   http://localhost:3000/api/docs
   ```

2. ابحث عن قسم **"auth"** (المصادقة)

3. اضغط على **POST /api/v1/auth/login**

4. اضغط على **"Try it out"**

5. أدخل البيانات التالية:
   ```json
   {
     "email": "admin@company.com",
     "password": "admin123"
   }
   ```

6. اضغط **"Execute"**

7. انسخ الـ `accessToken` من النتيجة

### الطريقة الثانية: استخدام Terminal (curl)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123"
  }'
```

انسخ الـ `accessToken` من النتيجة.

---

## الخطوة 2: إضافة مستخدم جديد

### في Swagger UI:

1. ابحث عن قسم **"users"** (المستخدمين)

2. اضغط على **POST /api/v1/users**

3. اضغط على **"Try it out"**

4. في الأعلى، اضغط على **"Authorize"** (أيقونة القفل 🔒)

5. أدخل الـ Token الذي حصلت عليه من الخطوة 1:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (لا تنسى إضافة "Bearer " قبل الـ Token)

6. اضغط **"Authorize"** ثم **"Close"**

7. الآن أدخل بيانات المستخدم الجديد:
   ```json
   {
     "email": "newuser@company.com",
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

8. اضغط **"Execute"**

### في Terminal (curl):

```bash
# استبدل YOUR_ACCESS_TOKEN بالـ token الذي حصلت عليه
TOKEN="YOUR_ACCESS_TOKEN"

curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "newuser@company.com",
    "password": "password123",
    "firstName": "أحمد",
    "lastName": "محمد",
    "phone": "+966501234567",
    "jobTitle": "مطور برمجيات",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "branchId": "main-branch-id",
    "departmentId": "it-dept-id"
  }'
```

---

## معلومات مهمة:

### الأدوار المتاحة (role):
- `ADMIN` - مدير النظام
- `MANAGER` - مدير
- `EMPLOYEE` - موظف

### الحالات المتاحة (status):
- `ACTIVE` - نشط
- `INACTIVE` - غير نشط
- `SUSPENDED` - موقوف

### معرفات الفروع والأقسام الافتراضية:
- **الفرع الرئيسي:** `main-branch-id`
- **قسم تقنية المعلومات:** `it-dept-id`
- **قسم الموارد البشرية:** `hr-dept-id`

---

## مثال كامل في Terminal:

```bash
# 1. تسجيل الدخول
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123"
  }')

# 2. استخراج الـ Token
TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

# 3. إضافة مستخدم جديد
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "ahmed@company.com",
    "password": "password123",
    "firstName": "أحمد",
    "lastName": "علي",
    "phone": "+966501234567",
    "jobTitle": "مطور Flutter",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "branchId": "main-branch-id",
    "departmentId": "it-dept-id"
  }'
```

---

## نصائح:

1. **استخدم Swagger UI** - أسهل طريقة للاختبار والتعلم
2. **احفظ الـ Token** - ستحتاجه لكل طلب يحتاج مصادقة
3. **الـ Token ينتهي بعد 15 دقيقة** - إذا انتهى، سجل دخول مرة أخرى
4. **تحقق من معرفات الفروع** - استخدم `/api/v1/branches` لرؤية الفروع المتاحة

