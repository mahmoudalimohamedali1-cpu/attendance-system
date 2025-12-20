-- Create default company
INSERT INTO companies (id, name, name_en, created_at, updated_at)
SELECT gen_random_uuid(), 'الشركة الافتراضية', 'Default Company', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'الشركة الافتراضية');

-- Get the ID of the default company and update models
DO $$
DECLARE 
    comp_id UUID;
BEGIN
    SELECT id INTO comp_id FROM companies WHERE name = 'الشركة الافتراضية' LIMIT 1;
    
    IF comp_id IS NOT NULL THEN
        UPDATE users SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE branches SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE departments SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE job_titles SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE cost_centers SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE salary_components SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE salary_structures SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE policies SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE work_schedules SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE holidays SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE gosi_configs SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE payroll_periods SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE payroll_runs SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE attendances SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE leave_requests SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE letter_requests SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE notifications SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE audit_logs SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE advance_requests SET company_id = comp_id::TEXT WHERE company_id IS NULL;
        UPDATE retro_pays SET company_id = comp_id::TEXT WHERE company_id IS NULL;

        -- Cleanup duplicate names in departments
        WITH dups AS (
            SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
            FROM departments
            WHERE company_id = comp_id::TEXT
        )
        UPDATE departments d
        SET name = d.name || ' (' || dups.rn || ')'
        FROM dups
        WHERE d.id = dups.id AND dups.rn > 1;

        -- Cleanup GosiConfig duplicates (keep only the latest active one)
        WITH latest_gosi AS (
            SELECT id FROM gosi_configs 
            WHERE company_id = comp_id::TEXT AND is_active = true 
            ORDER BY created_at DESC LIMIT 1
        )
        UPDATE gosi_configs SET is_active = false 
        WHERE company_id = comp_id::TEXT AND is_active = true 
        AND id NOT IN (SELECT id FROM latest_gosi);
    END IF;
END $$;

-- Audit for duplicates that would violate the new unique constraints
SELECT 'job_titles' as table, name, COUNT(*) FROM job_titles GROUP BY name HAVING COUNT(*) > 1;
SELECT 'branches' as table, name, COUNT(*) FROM branches GROUP BY name HAVING COUNT(*) > 1;
SELECT 'departments' as table, name, COUNT(*) FROM departments GROUP BY name HAVING COUNT(*) > 1;
SELECT 'salary_structures' as table, name, COUNT(*) FROM salary_structures GROUP BY name HAVING COUNT(*) > 1;
SELECT 'cost_centers' as table, code, COUNT(*) FROM cost_centers GROUP BY code HAVING COUNT(*) > 1;
SELECT 'salary_components' as table, code, COUNT(*) FROM salary_components GROUP BY code HAVING COUNT(*) > 1;
SELECT 'policies' as table, code, COUNT(*) FROM policies GROUP BY code HAVING COUNT(*) > 1;
