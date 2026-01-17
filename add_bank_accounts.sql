INSERT INTO employee_bank_accounts (id, user_id, iban, bank_name, bank_code, is_primary, is_verified, account_holder_name, created_at, updated_at)
SELECT 
    gen_random_uuid()::text, 
    u.id, 
    'SA0380000000608010167519', 
    'بنك الراجحي', 
    'RJHI', 
    true, 
    true, 
    COALESCE(u.first_name || ' ' || u.last_name, 'الموظف'), 
    NOW(), 
    NOW() 
FROM users u
WHERE u.status = 'ACTIVE' 
AND u.id NOT IN (SELECT eb.user_id FROM employee_bank_accounts eb);
