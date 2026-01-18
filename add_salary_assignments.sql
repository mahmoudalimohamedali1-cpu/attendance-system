-- Add salary structure assignments for all active employees
INSERT INTO employee_salary_assignments (id, employee_id, structure_id, base_salary, effective_date, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    u.id,
    '8098c898-e8d5-491a-a892-d9c4bc4e2f27',  -- راتب المندوب
    COALESCE(u.salary, 5000),
    '2024-01-01'::date,
    true,
    NOW(),
    NOW()
FROM users u
WHERE u.status = 'ACTIVE'
AND u.id NOT IN (SELECT employee_id FROM employee_salary_assignments);
