-- CreateTable
CREATE TABLE "employee_terminations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "reason" VARCHAR(50) NOT NULL,
    "last_working_day" TIMESTAMP(3) NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "years_of_service" DECIMAL(10,2),
    "months_of_service" INTEGER,
    "days_of_service" INTEGER,
    "total_days_of_service" INTEGER,
    "base_salary" DECIMAL(12,2),
    "housing_allowance" DECIMAL(12,2) DEFAULT 0,
    "transportation_allowance" DECIMAL(12,2) DEFAULT 0,
    "phone_allowance" DECIMAL(12,2) DEFAULT 0,
    "other_fixed_allowances" DECIMAL(12,2) DEFAULT 0,
    "total_salary" DECIMAL(12,2),
    "eos_for_first_5_years" DECIMAL(12,2),
    "eos_for_remaining" DECIMAL(12,2),
    "total_eos" DECIMAL(12,2),
    "eos_adjustment_factor" DECIMAL(5,3),
    "adjusted_eos" DECIMAL(12,2),
    "remaining_leave_days" INTEGER,
    "leave_payout" DECIMAL(12,2),
    "outstanding_loans" DECIMAL(12,2),
    "unreturned_custody_value" DECIMAL(12,2),
    "outstanding_debts" DECIMAL(12,2),
    "unpaid_penalties" DECIMAL(12,2),
    "total_deductions" DECIMAL(12,2),
    "net_settlement" DECIMAL(12,2),
    "notes" TEXT,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_terminations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_terminations_company_id_idx" ON "employee_terminations"("company_id");

-- CreateIndex
CREATE INDEX "employee_terminations_employee_id_idx" ON "employee_terminations"("employee_id");

-- AddForeignKey
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_terminations" ADD CONSTRAINT "employee_terminations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
