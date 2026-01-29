-- Migration: Add employee_salary_assignments table
-- Date: 2026-01-29
-- Purpose: Unify salary management with salary structures

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_salary_assignments_employee ON employee_salary_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_assignments_active ON employee_salary_assignments(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_salary_assignments_effective ON employee_salary_assignments(employee_id, effective_date);

-- Add foreign key to salary_structures if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salary_structures') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_salary_assignments_structure'
        ) THEN
            ALTER TABLE employee_salary_assignments 
            ADD CONSTRAINT fk_salary_assignments_structure 
            FOREIGN KEY (structure_id) REFERENCES salary_structures(id);
        END IF;
    END IF;
END $$;

-- Sync existing user salaries to salary_assignments
-- This creates an assignment for each user with a salary but no active assignment
INSERT INTO employee_salary_assignments (employee_id, structure_id, base_salary, effective_date, is_active)
SELECT 
    u.id,
    COALESCE(
        (SELECT id FROM salary_structures WHERE company_id = u.company_id LIMIT 1),
        (SELECT id FROM salary_structures LIMIT 1)
    ),
    u.salary,
    COALESCE(u.hire_date, NOW()),
    true
FROM users u
WHERE u.salary IS NOT NULL 
  AND u.salary > 0
  AND u.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM employee_salary_assignments sa 
    WHERE sa.employee_id = u.id AND sa.is_active = true
  )
  AND EXISTS (SELECT 1 FROM salary_structures LIMIT 1)
ON CONFLICT DO NOTHING;

-- Grant message
SELECT 'Migration completed: employee_salary_assignments table created' AS result;
