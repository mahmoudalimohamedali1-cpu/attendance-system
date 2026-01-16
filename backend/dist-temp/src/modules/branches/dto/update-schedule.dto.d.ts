declare class ScheduleItem {
    dayOfWeek: number;
    workStartTime: string;
    workEndTime: string;
    isWorkingDay?: boolean;
}
export declare class UpdateScheduleDto {
    schedules: ScheduleItem[];
}
export {};
