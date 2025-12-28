-- CreateIndex
CREATE INDEX "payroll_adjustments_company_id_employee_id_payroll_period_i_idx" ON "payroll_adjustments"("company_id", "employee_id", "payroll_period_id", "status");
