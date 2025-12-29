-- Create PayrollSettings table if not exists
CREATE TABLE IF NOT EXISTS "payroll_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payroll_closing_day" INTEGER NOT NULL DEFAULT 25,
    "hire_termination_calc_base" TEXT NOT NULL DEFAULT 'CALENDAR_DAYS',
    "hire_termination_method" TEXT NOT NULL DEFAULT 'EXCLUDE_WEEKENDS',
    "unpaid_leave_calc_base" TEXT NOT NULL DEFAULT 'ACTUAL_WORKING_DAYS',
    "unpaid_leave_method" TEXT NOT NULL DEFAULT 'BASED_ON_SHIFTS',
    "split_unpaid_by_closing_date" BOOLEAN NOT NULL DEFAULT false,
    "overtime_calc_base" TEXT NOT NULL DEFAULT 'ACTUAL_WORKING_DAYS',
    "overtime_method" TEXT NOT NULL DEFAULT 'BASED_ON_SHIFTS',
    "leave_allowance_calc_base" TEXT NOT NULL DEFAULT 'CALENDAR_DAYS',
    "leave_allowance_method" TEXT NOT NULL DEFAULT 'BASIC_PLUS_HOUSING',
    "show_company_contributions" BOOLEAN NOT NULL DEFAULT true,
    "show_closing_date_on_payslip" BOOLEAN NOT NULL DEFAULT true,
    "deduct_absence_from_basic" BOOLEAN NOT NULL DEFAULT true,
    "show_actual_absence_days" BOOLEAN NOT NULL DEFAULT false,
    "enable_negative_balance_carryover" BOOLEAN NOT NULL DEFAULT false,
    "settle_negative_as_transaction" BOOLEAN NOT NULL DEFAULT false,
    "round_salary_to_nearest" INTEGER NOT NULL DEFAULT 0,
    "default_working_days_per_month" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on company_id
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_settings_company_id_key" ON "payroll_settings"("company_id");

-- Create foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payroll_settings_company_id_fkey'
    ) THEN
        ALTER TABLE "payroll_settings" 
        ADD CONSTRAINT "payroll_settings_company_id_fkey" 
        FOREIGN KEY ("company_id") 
        REFERENCES "companies"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

