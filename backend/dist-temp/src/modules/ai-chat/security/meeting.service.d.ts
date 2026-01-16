export interface Meeting {
    id: string;
    title: string;
    organizer: string;
    organizerName: string;
    attendees: string[];
    startTime: Date;
    endTime: Date;
    room?: string;
    type: 'in_person' | 'virtual' | 'hybrid';
    link?: string;
    notes?: string;
    status: 'scheduled' | 'cancelled' | 'completed';
}
export interface MeetingRoom {
    id: string;
    name: string;
    nameAr: string;
    capacity: number;
    floor: number;
    amenities: string[];
    available: boolean;
}
export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    conflict?: string;
}
export declare class MeetingService {
    private readonly logger;
    private meetings;
    private readonly rooms;
    scheduleMeeting(userId: string, userName: string, request: string): {
        success: boolean;
        meeting?: Meeting;
        message: string;
    };
    private parseRequest;
    private formatMeetingConfirmation;
    getAvailableRooms(startTime: Date, endTime: Date, minCapacity?: number): MeetingRoom[];
    getUserMeetings(userId: string): Meeting[];
    formatTodaySchedule(userId: string): string;
    cancelMeeting(meetingId: string, userId: string): {
        success: boolean;
        message: string;
    };
    formatAvailableRooms(): string;
}
