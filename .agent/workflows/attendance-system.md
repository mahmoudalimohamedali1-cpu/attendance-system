---
description: سيستم الحضور والانصراف - المعلومات الأساسية والسياق
---

# نظام الحضور والانصراف (Attendance System)

## 🔗 معلومات السيرفر
- **السيرفر:** 72.61.239.170
- **كلمة سر SSH:** GamalSaad35@#
- **قاعدة البيانات:** PostgreSQL
  - User: attendance_user
  - Password: Attend2024Secure
  - Database: attendance_db

## 📁 هيكل المشروع
```
/Users/gamal/attendance-system/
├── backend/          # NestJS Backend
├── web-admin/        # React Admin Panel (Vite)
├── mobile/           # Flutter Mobile App
└── .agent/workflows/ # Workflow files
```

## 🚀 أوامر النشر

### Backend
```bash
# بناء محلي
cd backend && npm run build

# مزامنة ونشر
sshpass -p 'GamalSaad35@#' rsync -avz --delete backend/src/ root@72.61.239.170:/var/www/attendance-system/backend/src/
sshpass -p 'GamalSaad35@#' ssh root@72.61.239.170 "cd /var/www/attendance-system/backend && npm run build && pm2 restart attendance-backend"
```

### Frontend (web-admin)
```bash
cd web-admin && npm run build
sshpass -p 'GamalSaad35@#' rsync -avz --delete web-admin/dist/ root@72.61.239.170:/var/www/attendance-system/web-admin/dist/
```

## 🔐 نظام الصلاحيات

### الصلاحيات الرئيسية (9 صلاحيات)
| القسم | VIEW | APPROVE_MANAGER | APPROVE_HR |
|---|---|---|---|
| الإجازات | LEAVES_VIEW | LEAVES_APPROVE_MANAGER | LEAVES_APPROVE_HR |
| الخطابات | LETTERS_VIEW | LETTERS_APPROVE_MANAGER | LETTERS_APPROVE_HR |
| الزيادات | RAISES_VIEW | RAISES_APPROVE_MANAGER | RAISES_APPROVE_HR |

### النطاقات (Scopes)
- `SELF` - نفسه فقط
- `TEAM` - فريقه المباشر
- `BRANCH` - فرع معين
- `DEPARTMENT` - قسم معين
- `ALL` - كل الموظفين
- `CUSTOM` - موظفين محددين

## 👥 حسابات الاختبار
- **Admin:** (check database)
- **Manager:** g@go.com / 123456789
- **Employee:** t@test.com

## 📂 الملفات المهمة
- `backend/src/modules/permissions/permissions.service.ts` - منطق الصلاحيات
- `backend/src/modules/raises/raises.service.ts` - طلبات الزيادات
- `backend/src/modules/leaves/leaves.service.ts` - طلبات الإجازات
- `backend/src/modules/letters/letters.service.ts` - طلبات الخطابات
- `web-admin/src/components/layout/MainLayout.tsx` - القائمة الجانبية
- `web-admin/src/pages/permissions/PermissionsPage.tsx` - صفحة الصلاحيات

## 🔄 Workflow الموافقات
1. **الموظف** يقدم الطلب → يذهب لـ "صندوق المدير"
2. **المدير** يوافق → يذهب لـ "صندوق HR"
3. **HR** يوافق → الطلب معتمد

## 🗄️ أوامر قاعدة البيانات
```bash
# الاتصال بقاعدة البيانات
sshpass -p 'GamalSaad35@#' ssh root@72.61.239.170 "PGPASSWORD='Attend2024Secure' psql -h localhost -U attendance_user -d attendance_db -c \"YOUR_QUERY\""
```
