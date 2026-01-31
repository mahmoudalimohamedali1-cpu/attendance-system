/**
 * Enterprise Payroll Service
 * خدمة الرواتب على مستوى المؤسسات
 */

import { api } from './api.service';

// ============================================================
// INTERFACES
// ============================================================

// Analytics
export interface PayrollAnalytics {
    summary: {
        totalGross: number;
        totalNet: number;
        totalDeductions: number;
        employeeCount: number;
        avgSalary: number;
    };
    byDepartment: Array<{
        departmentId: string;
        departmentName: string;
        totalGross: number;
        totalNet: number;
        employeeCount: number;
    }>;
    trends: {
        periods: string[];
        gross: number[];
        net: number[];
        headcount: number[];
    };
}

export interface PayrollKPIs {
    costPerEmployee: number;
    payrollToRevenue: number;
    overtimeRatio: number;
    benefitsCostRatio: number;
    turnoverImpact: number;
    complianceScore: number;
}

// Self-Service
export interface PayslipSummary {
    id: string;
    year: number;
    month: number;
    periodName: string;
    grossSalary: number;
    netSalary: number;
    totalDeductions: number;
    paidDate?: Date;
    status: string;
}

export interface PayslipDetails {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode?: string;
    department?: string;
    jobTitle?: string;
    year: number;
    month: number;
    periodStart: Date;
    periodEnd: Date;
    basicSalary: number;
    earnings: Array<{
        code: string;
        name: string;
        nameAr?: string;
        amount: number;
    }>;
    deductions: Array<{
        code: string;
        name: string;
        nameAr?: string;
        amount: number;
    }>;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        iban?: string;
    };
    paidDate?: Date;
    currency: string;
}

export interface YTDSummary {
    year: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    totalBonuses: number;
    totalOvertime: number;
    monthlyBreakdown: Array<{
        month: number;
        gross: number;
        net: number;
    }>;
}

export interface LeaveBalance {
    type: string;
    typeName: string;
    typeNameAr: string;
    entitled: number;
    used: number;
    pending: number;
    remaining: number;
    carryOver?: number;
    expiryDate?: Date;
}

// Audit
export interface AuditTrailEntry {
    id: string;
    timestamp: Date;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
}

export interface ComplianceScore {
    overallScore: number;
    categories: Array<{
        category: string;
        status: 'PASS' | 'WARNING' | 'FAIL';
        details: string;
    }>;
}

// Benefits
export interface BenefitPlan {
    id: string;
    name: string;
    nameAr: string;
    type: string;
    description?: string;
    employeeCost: number;
    employerCost: number;
    coverageLevels: string[];
    isActive: boolean;
}

export interface EmployeeBenefit {
    id: string;
    planId: string;
    planName: string;
    coverageLevel: string;
    status: string;
    enrollmentDate: Date;
    effectiveDate: Date;
    employeeCost: number;
    employerCost: number;
}

// Garnishments
export interface GarnishmentOrder {
    id: string;
    employeeId: string;
    type: string;
    status: string;
    caseNumber?: string;
    courtName?: string;
    originalAmount: number;
    remainingBalance: number;
    monthlyDeduction: number;
    effectiveDate: Date;
    endDate?: Date;
}

// Simulation
export interface SimulationResult {
    id: string;
    type: string;
    parameters: any;
    results: {
        currentCost: number;
        projectedCost: number;
        difference: number;
        percentChange: number;
        affectedEmployees: number;
    };
    createdAt: Date;
}

// ============================================================
// SERVICE CLASS
// ============================================================

class EnterprisePayrollService {
    private baseUrl = '/enterprise-payroll';

    // ==================== التحليلات ====================

    async getAnalyticsDashboard(year: number, month: number): Promise<PayrollAnalytics> {
        return api.get(`${this.baseUrl}/analytics/dashboard?year=${year}&month=${month}`);
    }

    async getPayrollKPIs(year: number, month: number): Promise<PayrollKPIs> {
        return api.get(`${this.baseUrl}/analytics/kpis?year=${year}&month=${month}`);
    }

    async getDepartmentAnalytics(departmentId: string, year: number, month: number): Promise<any> {
        return api.get(`${this.baseUrl}/analytics/department/${departmentId}?year=${year}&month=${month}`);
    }

    async getTrendAnalysis(months?: number): Promise<any> {
        return api.get(`${this.baseUrl}/analytics/trends?months=${months || 12}`);
    }

    async getCostHeatmap(year: number): Promise<any> {
        return api.get(`${this.baseUrl}/analytics/heatmap?year=${year}`);
    }

    // ==================== التدقيق ====================

    async getAuditTrail(options?: { startDate?: string; endDate?: string; limit?: number }): Promise<{ entries: AuditTrailEntry[]; total: number }> {
        const params = new URLSearchParams();
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);
        if (options?.limit) params.append('limit', options.limit.toString());
        return api.get(`${this.baseUrl}/audit/trail?${params.toString()}`);
    }

    async getAuditReport(startDate: string, endDate: string): Promise<any> {
        return api.get(`${this.baseUrl}/audit/report?startDate=${startDate}&endDate=${endDate}`);
    }

    async getComplianceScore(): Promise<ComplianceScore> {
        return api.get(`${this.baseUrl}/audit/compliance-score`);
    }

    async getReconciliationReport(year: number, month: number): Promise<any> {
        return api.get(`${this.baseUrl}/audit/reconciliation?year=${year}&month=${month}`);
    }

    // ==================== التنبؤات ====================

    async getPayrollProjection(months?: number): Promise<any> {
        return api.get(`${this.baseUrl}/forecasting/projection?months=${months || 12}`);
    }

    async getBudgetComparison(year: number): Promise<any> {
        return api.get(`${this.baseUrl}/forecasting/budget-comparison?year=${year}`);
    }

    async runScenarioAnalysis(params: { salaryIncreasePercent?: number; headcountChange?: number }): Promise<any> {
        return api.post(`${this.baseUrl}/forecasting/scenario`, params);
    }

    // ==================== ملفات البنوك ====================

    async generateBankFile(payrollRunId: string, format: string, config?: any): Promise<any> {
        return api.post(`${this.baseUrl}/bank-files/generate`, { payrollRunId, format, config });
    }

    async getSupportedBankFormats(): Promise<string[]> {
        return api.get(`${this.baseUrl}/bank-files/formats`);
    }

    async validateBankFile(content: string, format: string): Promise<any> {
        return api.post(`${this.baseUrl}/bank-files/validate`, { content, format });
    }

    // ==================== بوابة الموظف ====================

    async getMyPayslips(options?: { year?: number; limit?: number }): Promise<{ payslips: PayslipSummary[]; total: number; hasMore: boolean }> {
        const params = new URLSearchParams();
        if (options?.year) params.append('year', options.year.toString());
        if (options?.limit) params.append('limit', options.limit.toString());
        return api.get(`${this.baseUrl}/self-service/payslips?${params.toString()}`);
    }

    async getPayslipDetails(payslipId: string): Promise<PayslipDetails> {
        return api.get(`${this.baseUrl}/self-service/payslip/${payslipId}`);
    }

    async getYTDSummary(year?: number): Promise<YTDSummary> {
        const params = year ? `?year=${year}` : '';
        return api.get(`${this.baseUrl}/self-service/ytd${params}`);
    }

    async getTaxCertificate(year: number): Promise<any> {
        return api.get(`${this.baseUrl}/self-service/tax-certificate/${year}`);
    }

    async getLeaveBalances(): Promise<LeaveBalance[]> {
        return api.get(`${this.baseUrl}/self-service/leaves`);
    }

    async getSalaryHistory(): Promise<any[]> {
        return api.get(`${this.baseUrl}/self-service/salary-history`);
    }

    async getEmployeeDashboard(): Promise<any> {
        return api.get(`${this.baseUrl}/self-service/dashboard`);
    }

    async requestDocument(type: string, details?: string): Promise<any> {
        return api.post(`${this.baseUrl}/self-service/document-request`, { type, details });
    }

    // ==================== المزايا ====================

    async getBenefitPlans(): Promise<BenefitPlan[]> {
        return api.get(`${this.baseUrl}/benefits/plans`);
    }

    async getEmployeeBenefits(employeeId: string): Promise<EmployeeBenefit[]> {
        return api.get(`${this.baseUrl}/benefits/employee/${employeeId}`);
    }

    async enrollInBenefit(data: { employeeId: string; planId: string; coverageLevel: string; effectiveDate: string }): Promise<any> {
        return api.post(`${this.baseUrl}/benefits/enroll`, data);
    }

    async getBenefitDeductions(employeeId: string, year: number, month: number): Promise<any> {
        return api.get(`${this.baseUrl}/benefits/deductions/${employeeId}?year=${year}&month=${month}`);
    }

    // ==================== الحجز القضائي ====================

    async getEmployeeGarnishments(employeeId: string): Promise<GarnishmentOrder[]> {
        return api.get(`${this.baseUrl}/garnishments/employee/${employeeId}`);
    }

    async createGarnishment(data: any): Promise<any> {
        return api.post(`${this.baseUrl}/garnishments/create`, data);
    }

    async calculateGarnishmentDeductions(employeeId: string, grossSalary: number): Promise<any> {
        return api.get(`${this.baseUrl}/garnishments/calculate/${employeeId}?grossSalary=${grossSalary}`);
    }

    // ==================== الامتثال ====================

    async getComplianceRequirements(country?: string): Promise<any> {
        const params = country ? `?country=${country}` : '';
        return api.get(`${this.baseUrl}/compliance/requirements${params}`);
    }

    async runComplianceCheck(): Promise<any> {
        return api.get(`${this.baseUrl}/compliance/check`);
    }

    async getSupportedCountries(): Promise<any[]> {
        return api.get(`${this.baseUrl}/compliance/countries`);
    }

    // ==================== العملات ====================

    async getExchangeRates(): Promise<any> {
        return api.get(`${this.baseUrl}/currency/rates`);
    }

    async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<any> {
        return api.post(`${this.baseUrl}/currency/convert`, { amount, fromCurrency, toCurrency });
    }

    async getSupportedCurrencies(): Promise<any[]> {
        return api.get(`${this.baseUrl}/currency/supported`);
    }

    // ==================== بوابة الدفع ====================

    async getPaymentGateways(): Promise<any[]> {
        return api.get(`${this.baseUrl}/payment/gateways`);
    }

    async processPayment(payrollRunId: string, gateway: string): Promise<any> {
        return api.post(`${this.baseUrl}/payment/process`, { payrollRunId, gateway });
    }

    async getPaymentStatus(paymentId: string): Promise<any> {
        return api.get(`${this.baseUrl}/payment/status/${paymentId}`);
    }

    // ==================== الإشعارات ====================

    async getNotificationPreferences(): Promise<any> {
        return api.get(`${this.baseUrl}/notifications/preferences`);
    }

    async updateNotificationPreferences(preferences: any): Promise<any> {
        return api.post(`${this.baseUrl}/notifications/preferences`, preferences);
    }

    async sendNotification(type: string, recipients: string[], data: any): Promise<any> {
        return api.post(`${this.baseUrl}/notifications/send`, { type, recipients, data });
    }

    // ==================== تحليل الفروقات ====================

    async getVarianceAnalysis(period1: { year: number; month: number }, period2: { year: number; month: number }): Promise<any> {
        return api.get(`${this.baseUrl}/variance/analysis?period1Year=${period1.year}&period1Month=${period1.month}&period2Year=${period2.year}&period2Month=${period2.month}`);
    }

    async getEmployeeVariance(employeeId: string, months?: number): Promise<any> {
        return api.get(`${this.baseUrl}/variance/employee/${employeeId}?months=${months || 6}`);
    }

    // ==================== المحاكاة ====================

    async runSimulation(type: string, parameters: any): Promise<SimulationResult> {
        return api.post(`${this.baseUrl}/simulation/run`, { type, parameters });
    }

    async getSimulationHistory(): Promise<SimulationResult[]> {
        return api.get(`${this.baseUrl}/simulation/history`);
    }

    async getSimulationDetails(simulationId: string): Promise<SimulationResult> {
        return api.get(`${this.baseUrl}/simulation/${simulationId}`);
    }

    // ==================== نهاية السنة ====================

    async getYearEndStatus(year: number): Promise<any> {
        return api.get(`${this.baseUrl}/year-end/status?year=${year}`);
    }

    async processYearEnd(year: number): Promise<any> {
        return api.post(`${this.baseUrl}/year-end/process`, { year });
    }

    async getYearEndChecklist(year: number): Promise<any> {
        return api.get(`${this.baseUrl}/year-end/checklist?year=${year}`);
    }

    async carryForwardBalances(year: number, options?: any): Promise<any> {
        return api.post(`${this.baseUrl}/year-end/carry-forward`, { year, options });
    }

    // ==================== تعديلات الخصومات ====================

    /**
     * 🕐 معاينة خصومات الحضور للفترة
     */
    async getAttendanceDeductionsPreview(periodId?: string): Promise<any> {
        const params = periodId ? `?periodId=${periodId}` : '';
        return api.get(`/payroll-adjustments/attendance-deductions-preview${params}`);
    }

    /**
     * ✏️ تعديل مبلغ الخصم
     */
    async modifyDeduction(data: {
        employeeId: string;
        deductionType: 'LATE' | 'ABSENCE' | 'EARLY';
        originalAmount: number;
        newAmount: number;
        reason: string;
        periodId?: string;
    }): Promise<any> {
        return api.post('/payroll-adjustments/attendance-deductions/modify', data);
    }

    /**
     * 🔄 تحويل الخصم لإجازة
     */
    async convertDeductionToLeave(data: {
        employeeId: string;
        deductionType: 'LATE' | 'ABSENCE' | 'EARLY';
        originalAmount: number;
        leaveDays: number;
        leaveType: string;
        reason: string;
        periodId?: string;
    }): Promise<any> {
        return api.post('/payroll-adjustments/attendance-deductions/convert-to-leave', data);
    }

    /**
     * ❌ إلغاء خصم بالكامل
     */
    async waiveDeduction(data: {
        employeeId: string;
        deductionType: 'LATE' | 'ABSENCE' | 'EARLY';
        originalAmount: number;
        reason: string;
        periodId?: string;
    }): Promise<any> {
        return api.post('/payroll-adjustments/attendance-deductions/waive', data);
    }
}

export const enterprisePayrollService = new EnterprisePayrollService();
