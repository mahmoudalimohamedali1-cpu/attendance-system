-- إنشاء عقود تلقائية للموظفين الذين ليس لديهم عقود
INSERT INTO contracts (
    id, user_id, contract_number, type, status, 
    start_date, end_date, probation_end_date,
    contract_job_title, working_hours_per_week,
    basic_salary, housing_allowance, transport_allowance, total_salary,
    annual_leave_days, notice_period_days,
    employee_signature, employer_signature,
    qiwa_status, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    'CNT-' || LPAD(ROW_NUMBER() OVER (ORDER BY u.created_at)::text, 5, '0'),
    'PERMANENT',
    'ACTIVE',
    COALESCE(u.hire_date, u.created_at::date),
    NULL,
    COALESCE(u.hire_date, u.created_at::date) + INTERVAL '90 days',
    COALESCE(u.profession, u.job_title, 'موظف'),
    48,
    COALESCE(u.salary * 0.6, 5000),
    COALESCE(u.salary * 0.25, 1250),
    COALESCE(u.salary * 0.15, 500),
    COALESCE(u.salary, 6750),
    21,
    30,
    true,
    true,
    'NOT_SUBMITTED',
    NOW(),
    NOW()
FROM users u
WHERE u.role IN ('EMPLOYEE', 'HR', 'MANAGER')
AND u.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.user_id = u.id);
