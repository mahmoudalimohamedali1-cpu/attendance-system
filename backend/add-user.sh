#!/bin/bash

# سكريبت إضافة مستخدم جديد
# استخدام: ./add-user.sh

echo "🔐 تسجيل الدخول كأدمن..."
echo ""

# تسجيل الدخول
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123"
  }')

# التحقق من نجاح تسجيل الدخول
if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo "✅ تم تسجيل الدخول بنجاح!"
    echo ""
    
    # استخراج الـ Token
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ فشل استخراج الـ Token"
        exit 1
    fi
    
    echo "📝 أدخل بيانات المستخدم الجديد:"
    echo ""
    read -p "البريد الإلكتروني: " EMAIL
    read -p "كلمة المرور: " PASSWORD
    read -p "الاسم الأول: " FIRST_NAME
    read -p "الاسم الأخير: " LAST_NAME
    read -p "رقم الهاتف (اختياري): " PHONE
    read -p "المسمى الوظيفي (اختياري): " JOB_TITLE
    read -p "الدور (EMPLOYEE/MANAGER/ADMIN) [EMPLOYEE]: " ROLE
    ROLE=${ROLE:-EMPLOYEE}
    
    echo ""
    echo "🔄 جاري إضافة المستخدم..."
    
    # بناء JSON
    JSON_DATA=$(cat <<EOF
{
  "email": "$EMAIL",
  "password": "$PASSWORD",
  "firstName": "$FIRST_NAME",
  "lastName": "$LAST_NAME",
  "phone": "$PHONE",
  "jobTitle": "$JOB_TITLE",
  "role": "$ROLE",
  "status": "ACTIVE",
  "branchId": "main-branch-id",
  "departmentId": "it-dept-id"
}
EOF
)
    
    # إضافة المستخدم
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/users \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$JSON_DATA")
    
    # عرض النتيجة
    if echo "$RESPONSE" | grep -q "email"; then
        echo "✅ تم إضافة المستخدم بنجاح!"
        echo ""
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo "❌ فشل إضافة المستخدم"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    fi
else
    echo "❌ فشل تسجيل الدخول"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

