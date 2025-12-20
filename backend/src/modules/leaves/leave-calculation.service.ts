import { Injectable } from '@nestjs/common';

/**
 * حساب الإجازات حسب قانون العمل السعودي (المادة 109)
 * - أقل من 5 سنوات خدمة = 21 يوم/سنة (تتراكم يومياً)
 * - 5 سنوات أو أكثر = 30 يوم/سنة (تتراكم يومياً)
 */
@Injectable()
export class LeaveCalculationService {

    /**
     * حساب عدد أيام الإجازة المتراكمة بناءً على تاريخ التعيين
     * الحساب بالتناسب: كل يوم عمل يتراكم جزء من الإجازة
     * @param hireDate تاريخ مباشرة العمل
     * @param usedDays الأيام المستخدمة
     * @returns عدد أيام الإجازة المتبقية
     */
    calculateRemainingLeaveDays(hireDate: Date, usedDays: number = 0): number {
        const earned = this.calculateEarnedLeaveDays(hireDate);
        return Math.max(0, Math.floor(earned - usedDays));
    }

    /**
     * حساب إجمالي الأيام المستحقة من تاريخ التعيين
     * 21 يوم / 365 يوم = 0.0575 يوم لكل يوم عمل (أول 5 سنوات)
     * 30 يوم / 365 يوم = 0.0822 يوم لكل يوم عمل (بعد 5 سنوات)
     */
    calculateEarnedLeaveDays(hireDate: Date, endDate: Date = new Date()): number {
        const start = new Date(hireDate);
        const end = new Date(endDate);

        if (start >= end) {
            return 0;
        }

        // حساب إجمالي الأيام من التعيين
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const fiveYearsInDays = 5 * 365;

        let earnedDays = 0;

        if (totalDays <= fiveYearsInDays) {
            // أول 5 سنوات: 21 يوم / 365 يوم
            earnedDays = (totalDays / 365) * 21;
        } else {
            // أول 5 سنوات = 5 × 21 = 105 يوم
            const first5Years = 5 * 21;
            // الأيام بعد 5 سنوات
            const daysAfter5Years = totalDays - fiveYearsInDays;
            // بعد 5 سنوات: 30 يوم / 365 يوم
            const after5Years = (daysAfter5Years / 365) * 30;
            earnedDays = first5Years + after5Years;
        }

        return Math.floor(earnedDays * 100) / 100; // تقريب لمنزلتين
    }

    /**
     * الحصول على عدد سنوات الخدمة
     */
    getYearsOfService(hireDate: Date, endDate: Date = new Date()): number {
        const start = new Date(hireDate);
        const end = new Date(endDate);
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.floor(totalDays / 365);
    }

    /**
     * الحصول على معدل الإجازة السنوية الحالي (21 أو 30)
     */
    getCurrentAnnualAllowance(hireDate: Date): number {
        const years = this.getYearsOfService(hireDate);
        return years >= 5 ? 30 : 21;
    }

    /**
     * ========== نظام عدم الترحيل ==========
     * حساب الإجازات للسنة الحالية فقط (بدون ترحيل من السنوات السابقة)
     */

    /**
     * حساب الرصيد المتبقي بدون ترحيل (للسنة الميلادية الحالية فقط)
     * @param hireDate تاريخ التعيين
     * @param usedDaysThisYear الأيام المستخدمة في السنة الحالية فقط
     * @returns الرصيد المتبقي للسنة الحالية
     */
    calculateRemainingLeaveDaysNoCarryover(hireDate: Date, usedDaysThisYear: number = 0): number {
        const annualAllowance = this.getCurrentAnnualAllowance(hireDate);
        const currentYear = new Date().getFullYear();
        const hireDateObj = new Date(hireDate);

        // إذا كان الموظف عُيّن هذا العام، نحسب بالتناسب
        if (hireDateObj.getFullYear() === currentYear) {
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);
            const daysInYear = 365;

            // الأيام من التعيين حتى نهاية السنة
            const daysWorked = Math.floor((endOfYear.getTime() - hireDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const proportionalAllowance = (daysWorked / daysInYear) * annualAllowance;

            return Math.max(0, Math.floor(proportionalAllowance - usedDaysThisYear));
        }

        // الموظف عُيّن قبل هذا العام = يستحق الرصيد الكامل
        return Math.max(0, annualAllowance - usedDaysThisYear);
    }

    /**
     * الحصول على بداية السنة الميلادية الحالية
     */
    getStartOfCurrentYear(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    /**
     * الحصول على نهاية السنة الميلادية الحالية
     */
    getEndOfCurrentYear(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
}
