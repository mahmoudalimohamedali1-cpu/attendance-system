/**
 * 🌙 Ramadan Mode Helper
 * Centralizes Ramadan-related calculations for attendance and payroll
 * 
 * Per Saudi Labor Law Article 99:
 * - Working hours during Ramadan must not exceed 6 hours daily or 36 hours weekly for Muslims
 */

export interface RamadanWorkSchedule {
    isRamadanActive: boolean;
    workStartTime: string;
    workEndTime: string;
    expectedWorkHours: number;
    expectedWorkMinutes: number;
}

export interface BranchRamadanConfig {
    ramadanModeEnabled: boolean;
    ramadanWorkHours?: number | null;
    ramadanWorkStartTime?: string | null;
    ramadanWorkEndTime?: string | null;
    workStartTime: string;
    workEndTime: string;
}

/**
 * Parse time string "HH:MM" to hours and minutes
 */
export function parseTime(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Format hours and minutes to "HH:MM" string
 */
export function formatTime(hours: number, minutes: number): string {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculate total minutes from time string
 */
export function timeToMinutes(time: string): number {
    const { hours, minutes } = parseTime(time);
    return hours * 60 + minutes;
}

/**
 * Get the effective work schedule considering Ramadan mode
 * 
 * @param branch - Branch configuration with Ramadan settings
 * @param departmentOverride - Optional department-level time overrides
 * @returns RamadanWorkSchedule with effective times and expected hours
 */
export function getRamadanWorkSchedule(
    branch: BranchRamadanConfig,
    departmentOverride?: { workStartTime?: string; workEndTime?: string }
): RamadanWorkSchedule {
    const isRamadanActive = branch.ramadanModeEnabled;

    if (!isRamadanActive) {
        // Regular mode - use department override or branch times
        const startTime = departmentOverride?.workStartTime || branch.workStartTime;
        const endTime = departmentOverride?.workEndTime || branch.workEndTime;

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const expectedMinutes = endMinutes - startMinutes;

        return {
            isRamadanActive: false,
            workStartTime: startTime,
            workEndTime: endTime,
            expectedWorkHours: expectedMinutes / 60,
            expectedWorkMinutes: expectedMinutes,
        };
    }

    // Ramadan mode active
    const ramadanHours = branch.ramadanWorkHours || 6; // Default 6 hours per Saudi Labor Law
    const startTime = branch.ramadanWorkStartTime || branch.workStartTime;

    // Calculate end time if not explicitly set
    let endTime = branch.ramadanWorkEndTime;
    if (!endTime) {
        const { hours: startHour, minutes: startMin } = parseTime(startTime);
        const totalEndMinutes = startHour * 60 + startMin + (ramadanHours * 60);
        const endHours = Math.floor(totalEndMinutes / 60) % 24; // Handle day overflow
        const endMins = totalEndMinutes % 60;
        endTime = formatTime(endHours, endMins);
    }

    return {
        isRamadanActive: true,
        workStartTime: startTime,
        workEndTime: endTime,
        expectedWorkHours: ramadanHours,
        expectedWorkMinutes: ramadanHours * 60,
    };
}

/**
 * Get expected work minutes for a given branch
 * Useful for payroll calculations
 */
export function getExpectedDailyMinutes(branch: BranchRamadanConfig): number {
    const schedule = getRamadanWorkSchedule(branch);
    return schedule.expectedWorkMinutes;
}

/**
 * Check if employee should be marked as late based on Ramadan schedule
 * 
 * @param currentMinutes - Current time in minutes from midnight
 * @param branch - Branch configuration
 * @param gracePeriod - Late grace period in minutes
 * @returns Object with isLate flag and lateMinutes
 */
export function calculateLateStatus(
    currentMinutes: number,
    branch: BranchRamadanConfig,
    gracePeriod: number
): { isLate: boolean; lateMinutes: number } {
    const schedule = getRamadanWorkSchedule(branch);
    const startMinutes = timeToMinutes(schedule.workStartTime);
    const graceEndMinutes = startMinutes + gracePeriod;

    if (currentMinutes > graceEndMinutes) {
        return {
            isLate: true,
            lateMinutes: currentMinutes - startMinutes,
        };
    }

    return {
        isLate: false,
        lateMinutes: 0,
    };
}

/**
 * Check if employee left early based on Ramadan schedule
 * 
 * @param currentMinutes - Current time in minutes from midnight
 * @param branch - Branch configuration
 * @returns Object with isEarly flag and earlyMinutes
 */
export function calculateEarlyLeaveStatus(
    currentMinutes: number,
    branch: BranchRamadanConfig
): { isEarly: boolean; earlyMinutes: number } {
    const schedule = getRamadanWorkSchedule(branch);
    const endMinutes = timeToMinutes(schedule.workEndTime);

    if (currentMinutes < endMinutes) {
        return {
            isEarly: true,
            earlyMinutes: endMinutes - currentMinutes,
        };
    }

    return {
        isEarly: false,
        earlyMinutes: 0,
    };
}
