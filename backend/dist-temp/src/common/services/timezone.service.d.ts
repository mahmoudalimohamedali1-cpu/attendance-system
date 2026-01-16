export declare class TimezoneService {
    private readonly DEFAULT_TIMEZONE;
    getLocalToday(timezone?: string): Date;
    getCurrentTimeMinutes(timezone?: string): number;
    parseDate(dateStr: string, timezone?: string): Date;
    getYearRange(year: number): {
        startOfYear: Date;
        endOfYear: Date;
    };
    getMonthRange(year: number, month: number): {
        startDate: Date;
        endDate: Date;
    };
    getCompanyTimezone(companyId: string): Promise<string>;
    isValidTimezone(timezone: string): boolean;
    getSupportedTimezones(): string[];
}
