-- تحديث استحقاقات أنواع الإجازات حسب نظام العمل السعودي
-- Update Leave Type Entitlements (Saudi Labor Law)

-- إجازة سنوية - 21 يوم (صحيح)
UPDATE leave_type_configs SET default_entitlement = 21 WHERE code = 'ANNUAL';

-- إجازة مرضية - 30 يوم (أول 30 يوم براتب كامل)
UPDATE leave_type_configs SET default_entitlement = 30 WHERE code = 'SICK';

-- إجازة زواج - 5 أيام
UPDATE leave_type_configs SET default_entitlement = 5 WHERE code = 'MARRIAGE';

-- إجازة وفاة - 5 أيام
UPDATE leave_type_configs SET default_entitlement = 5 WHERE code = 'BEREAVEMENT';

-- إجازة مولود جديد - 3 أيام
UPDATE leave_type_configs SET default_entitlement = 3 WHERE code = 'NEW_BABY';

-- إجازة حج - 15 يوم (مرة واحدة)
UPDATE leave_type_configs SET default_entitlement = 15 WHERE code = 'HAJJ';

-- إجازة اختبارات - حسب المدة الفعلية
UPDATE leave_type_configs SET default_entitlement = 0 WHERE code = 'EXAM';

-- مهمة عمل - حسب المدة الفعلية
UPDATE leave_type_configs SET default_entitlement = 0 WHERE code = 'BUSINESS_TRIP';

-- إجازة بدون راتب - بدون حد
UPDATE leave_type_configs SET default_entitlement = 0 WHERE code = 'UNPAID';

-- تحديث أرصدة الموظفين بناءً على القيم الجديدة
UPDATE leave_balances lb
SET entitled = ltc.default_entitlement
FROM leave_type_configs ltc
WHERE lb.leave_type_id = ltc.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- عرض النتيجة
SELECT code, name_ar, default_entitlement FROM leave_type_configs ORDER BY sort_order;
