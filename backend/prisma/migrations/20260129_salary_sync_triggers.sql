-- ═══════════════════════════════════════════════════════════════════
-- Professional Salary Sync System
-- Auto-syncs users.salary with employee_salary_assignments.base_salary
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create sync function: When salary_assignments changes, update users.salary
CREATE OR REPLACE FUNCTION sync_salary_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- When a salary assignment is created/updated and is active
    IF NEW.is_active = true THEN
        UPDATE users 
        SET salary = NEW.base_salary,
            updated_at = NOW()
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create reverse sync: When users.salary changes, update active assignment
CREATE OR REPLACE FUNCTION sync_salary_to_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if salary actually changed
    IF OLD.salary IS DISTINCT FROM NEW.salary AND NEW.salary IS NOT NULL THEN
        UPDATE employee_salary_assignments 
        SET base_salary = NEW.salary,
            updated_at = NOW()
        WHERE employee_id = NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create triggers
DROP TRIGGER IF EXISTS trg_salary_assignment_sync ON employee_salary_assignments;
CREATE TRIGGER trg_salary_assignment_sync
    AFTER INSERT OR UPDATE ON employee_salary_assignments
    FOR EACH ROW
    EXECUTE FUNCTION sync_salary_to_user();

DROP TRIGGER IF EXISTS trg_user_salary_sync ON users;
CREATE TRIGGER trg_user_salary_sync
    AFTER UPDATE OF salary ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_salary_to_assignment();

-- 4. Initial sync: Update users.salary from active assignments
UPDATE users u
SET salary = sa.base_salary,
    updated_at = NOW()
FROM employee_salary_assignments sa
WHERE u.id = sa.employee_id
  AND sa.is_active = true
  AND (u.salary IS NULL OR u.salary != sa.base_salary);

-- 5. Report
SELECT 'Salary Sync System installed successfully!' AS status;
SELECT 
    u.first_name || ' ' || u.last_name AS employee,
    u.salary AS synced_salary
FROM users u
JOIN employee_salary_assignments sa ON u.id = sa.employee_id AND sa.is_active = true
LIMIT 10;
