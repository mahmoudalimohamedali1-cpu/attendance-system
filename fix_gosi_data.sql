-- ============================================================
-- GOSI Configuration Fix Script
-- Date: 2026-01-28
-- Purpose: Fix GOSI data issues for proper calculation
-- ============================================================

-- Step 1: Get company ID
\echo '=== Step 1: Getting Company ID ==='
SELECT id, name FROM companies LIMIT 1;

-- Step 2: Deactivate any existing GOSI configs
\echo '=== Step 2: Deactivating existing GOSI configs ==='
UPDATE gosi_configs SET is_active = false WHERE is_active = true;

-- Step 3: Insert new correct GOSI config
\echo '=== Step 3: Creating new GOSI config (Saudi Law 2025-2026) ==='
INSERT INTO gosi_configs (
    id,
    company_id,
    version,
    effective_date,
    employee_rate,
    employer_rate,
    saned_rate,
    hazard_rate,
    max_cap_amount,
    min_base_salary,
    is_saudi_only,
    include_allowances,
    is_active,
    notes,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM companies LIMIT 1),
    1,
    CURRENT_DATE,
    9.00,     -- Employee rate (pension)
    9.00,     -- Employer rate (pension)
    0.75,     -- SANED rate
    2.00,     -- Hazard rate
    45000.00, -- Max cap
    0.00,     -- Min base
    true,     -- Saudi only
    true,     -- Include allowances (BASIC + HOUSING)
    true,     -- Active
    'إعداد التأمينات الاجتماعية - القانون السعودي 2025-2026',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM gosi_configs WHERE is_active = true
);

-- Step 4: Verify GOSI config created
\echo '=== Step 4: Verifying GOSI config ==='
SELECT id, employee_rate, employer_rate, saned_rate, hazard_rate, max_cap_amount, is_active 
FROM gosi_configs 
WHERE is_active = true;

-- Step 5: Update employees - mark Saudi employees
\echo '=== Step 5: Updating Saudi employees ==='
UPDATE users 
SET is_saudi = true 
WHERE nationality IN ('saudi', 'SA', 'SAU', 'سعودي', 'SAUDI', 'Saudi', 'المملكة العربية السعودية')
   OR nationality IS NULL; -- Assume null nationality = Saudi for demo

-- Step 6: Check how many employees updated
\echo '=== Step 6: Counting Saudi employees ==='
SELECT COUNT(*) as saudi_count FROM users WHERE is_saudi = true;
SELECT COUNT(*) as non_saudi_count FROM users WHERE is_saudi = false OR is_saudi IS NULL;

-- Step 7: Update salary components - mark gosiEligible
\echo '=== Step 7: Marking salary components as GOSI eligible ==='
UPDATE salary_components 
SET gosi_eligible = true 
WHERE code IN (
    'BASIC', 
    'HOUSING', 
    'HOUSING_ALLOWANCE', 
    'HRA', 
    'BASIC_SALARY',
    'BASE',
    'السكن',
    'الراتب الأساسي'
);

-- Also mark by type
UPDATE salary_components 
SET gosi_eligible = true 
WHERE (type = 'EARNING' OR type = 'ALLOWANCE')
  AND (
      LOWER(name_ar) LIKE '%أساسي%' OR
      LOWER(name_ar) LIKE '%سكن%' OR
      LOWER(name_en) LIKE '%basic%' OR
      LOWER(name_en) LIKE '%housing%'
  );

-- Step 8: Verify salary components
\echo '=== Step 8: Verifying GOSI eligible components ==='
SELECT code, name_ar, name_en, type, gosi_eligible 
FROM salary_components 
WHERE gosi_eligible = true
ORDER BY code;

-- Step 9: Show summary
\echo '=== SUMMARY ==='
\echo 'GOSI Configs:'
SELECT COUNT(*) as total_configs, 
       SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_configs 
FROM gosi_configs;

\echo 'Employees:'
SELECT 
    COUNT(*) as total_employees,
    SUM(CASE WHEN is_saudi = true THEN 1 ELSE 0 END) as saudi_employees,
    SUM(CASE WHEN is_saudi = false OR is_saudi IS NULL THEN 1 ELSE 0 END) as non_saudi_employees
FROM users 
WHERE role = 'EMPLOYEE' OR role = 'ADMIN';

\echo 'Salary Components:'
SELECT 
    COUNT(*) as total_components,
    SUM(CASE WHEN gosi_eligible = true THEN 1 ELSE 0 END) as gosi_eligible_count
FROM salary_components;

\echo '=== DONE! Please recalculate payroll to apply GOSI ==='
