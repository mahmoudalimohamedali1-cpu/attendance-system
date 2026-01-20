/**
 * 📅 Working Days Helper
 * Centralizes working days calculation with hierarchy:
 * Employee.workingDays → Department.workingDays → Branch.workingDays
 */

export interface WorkingDaysConfig {
    employeeWorkingDays?: string | null;
    departmentWorkingDays?: string | null;
    branchWorkingDays: string;
}

/**
 * Get effective working days with fallback hierarchy
 * 
 * Priority: Employee > Department > Branch
 * 
 * @returns Working days string like "0,1,2,3,4"
 */
export function getEffectiveWorkingDays(config: WorkingDaysConfig): string {
    return config.employeeWorkingDays
        || config.departmentWorkingDays
        || config.branchWorkingDays
        || '0,1,2,3,4'; // Default: Sun-Thu (Saudi weekend: Fri-Sat)
}

/**
 * Parse working days string to array of numbers
 * "0,1,2,3,4" → [0, 1, 2, 3, 4]
 */
export function parseWorkingDays(workingDays?: string | null): number[] {
    if (!workingDays) {
        return [0, 1, 2, 3, 4]; // Default: Sun-Thu
    }
    return workingDays.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
}

/**
 * Check if a day of week is a weekend (not a working day)
 * @param dayOfWeek 0 = Sunday, 6 = Saturday
 */
export function isWeekendDay(dayOfWeek: number, config: WorkingDaysConfig): boolean {
    const effectiveWorkingDays = getEffectiveWorkingDays(config);
    const workingDaysArray = parseWorkingDays(effectiveWorkingDays);
    return !workingDaysArray.includes(dayOfWeek);
}

/**
 * Check if today is a working day
 */
export function isTodayWorkingDay(config: WorkingDaysConfig): boolean {
    const today = new Date().getDay(); // 0 = Sunday
    return !isWeekendDay(today, config);
}

/**
 * Count working days in a date range
 */
export function countWorkingDaysInRange(
    startDate: Date,
    endDate: Date,
    config: WorkingDaysConfig
): number {
    const workingDaysArray = parseWorkingDays(getEffectiveWorkingDays(config));
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        if (workingDaysArray.includes(current.getDay())) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Get working days as Arabic text for display
 */
export function getWorkingDaysDisplay(workingDays: string): string {
    const dayNames: Record<number, string> = {
        0: 'الأحد',
        1: 'الاثنين',
        2: 'الثلاثاء',
        3: 'الأربعاء',
        4: 'الخميس',
        5: 'الجمعة',
        6: 'السبت',
    };

    const days = parseWorkingDays(workingDays);
    return days.map(d => dayNames[d] || '').filter(Boolean).join(', ');
}
