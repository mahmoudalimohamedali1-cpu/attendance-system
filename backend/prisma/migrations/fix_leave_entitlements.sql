-- تحديث استحقاقات أنواع الإجازات حسب نظام العمل السعودي
-- النص الصحيح بأسماء الجداول الفعلية

-- إجازة سنوية - 21 يوم (صحيح)
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 21 WHERE code = 'ANNUAL';

-- إجازة مرضية - 30 يوم (أول 30 يوم براتب كامل)
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 30 WHERE code = 'SICK';

-- إجازة زواج - 5 أيام
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 5 WHERE code = 'MARRIAGE';

-- إجازة وفاة - 5 أيام
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 5 WHERE code = 'BEREAVEMENT';

-- إجازة مولود جديد - 3 أيام
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 3 WHERE code = 'NEW_BABY';

-- إجازة حج - 15 يوم (مرة واحدة)
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 15 WHERE code = 'HAJJ';

-- إجازة اختبارات - حسب المدة الفعلية
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 0 WHERE code = 'EXAM';

-- مهمة عمل - حسب المدة الفعلية  
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 0 WHERE code = 'BUSINESS_TRIP';

-- إجازة بدون راتب - بدون حد
UPDATE "LeaveTypeConfig" SET "defaultEntitlement" = 0 WHERE code = 'UNPAID';

-- تحديث أرصدة الموظفين بناءً على القيم الجديدة
UPDATE "LeaveBalance" lb
SET entitled = ltc."defaultEntitlement"
FROM "LeaveTypeConfig" ltc
WHERE lb."leaveTypeId" = ltc.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- عرض النتيجة
SELECT code, "nameAr", "defaultEntitlement" FROM "LeaveTypeConfig" ORDER BY "sortOrder";
