import { api } from './api.service';

// ==================== Enums ====================

export type EventType = 'MEETING' | 'INTERVIEW' | 'PAYROLL' | 'HOLIDAY' | 'DEADLINE' | 'ANNOUNCEMENT' | 'OTHER';

export type EventStatus = 'SCHEDULED' | 'CANCELLED' | 'DONE';

export type RSVPStatus = 'INVITED' | 'GOING' | 'MAYBE' | 'DECLINED';

export type VisibilityType = 'PUBLIC' | 'DEPARTMENT' | 'TEAM' | 'TARGETED' | 'MANAGERS_ONLY' | 'HR_ONLY' | 'PRIVATE';

export type TargetType = 'BRANCH' | 'DEPARTMENT' | 'TEAM' | 'USER' | 'ROLE' | 'JOB_TITLE' | 'GRADE' | 'CONTRACT_TYPE' | 'SHIFT' | 'LOCATION' | 'TAG';

// ==================== Interfaces ====================

export interface EventCreator {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string | null;
    jobTitle?: string | null;
    department?: {
        id: string;
        name: string;
    } | null;
}

export interface EventAttendeeUser {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string | null;
    jobTitle?: string | null;
    department?: {
        id: string;
        name: string;
    } | null;
}

export interface EventAttendee {
    id: string;
    userId: string;
    user: EventAttendeeUser;
    rsvpStatus: RSVPStatus;
    respondedAt?: string | null;
    note?: string | null;
}

export interface EventTarget {
    id: string;
    eventId: string;
    targetType: TargetType;
    targetValue: string;
    isExclusion: boolean;
}

export interface CalendarEvent {
    id: string;
    companyId: string;
    creatorId: string;
    creator: EventCreator;
    title: string;
    titleEn?: string | null;
    description?: string | null;
    descriptionEn?: string | null;
    startAt: string;
    endAt: string;
    isAllDay: boolean;
    timezone?: string;
    location?: string | null;
    meetingLink?: string | null;
    eventType: EventType;
    visibilityType: VisibilityType;
    status: EventStatus;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    color?: string | null;
    icon?: string | null;
    attendees?: EventAttendee[];
    targets?: EventTarget[];
    _count?: {
        attendees: number;
    };
    userRsvpStatus?: RSVPStatus | null;
    isCreator?: boolean;
    rsvpStats?: {
        going: number;
        maybe: number;
        declined: number;
        invited: number;
        total: number;
    };
    createdAt: string;
    updatedAt: string;
}

// ==================== Request DTOs ====================

export interface EventTargetDto {
    targetType: TargetType;
    targetValue: string;
    isExclusion?: boolean;
}

export interface EventAttendeeDto {
    userId: string;
}

export interface CreateEventDto {
    title: string;
    titleEn?: string;
    description?: string;
    descriptionEn?: string;
    startAt: string;
    endAt: string;
    isAllDay?: boolean;
    timezone?: string;
    location?: string;
    meetingLink?: string;
    eventType?: EventType;
    visibilityType?: VisibilityType;
    isRecurring?: boolean;
    recurrenceRule?: string;
    color?: string;
    icon?: string;
    targets?: EventTargetDto[];
    attendees?: EventAttendeeDto[];
}

export interface UpdateEventDto {
    title?: string;
    titleEn?: string;
    description?: string;
    descriptionEn?: string;
    startAt?: string;
    endAt?: string;
    isAllDay?: boolean;
    timezone?: string;
    location?: string;
    meetingLink?: string;
    eventType?: EventType;
    status?: EventStatus;
    visibilityType?: VisibilityType;
    isRecurring?: boolean;
    recurrenceRule?: string;
    color?: string;
    icon?: string;
    targets?: EventTargetDto[];
    attendees?: EventAttendeeDto[];
}

export interface RSVPEventDto {
    status: RSVPStatus;
    note?: string;
}

// ==================== Response Types ====================

export interface EventsResponse {
    items: CalendarEvent[];
    total: number;
    limit?: number;
}

export interface AttendeesResponse {
    items: EventAttendee[];
    total: number;
}

export interface EventsStatsResponse {
    total: number;
    byType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
}

// ==================== Query Options ====================

export interface GetEventsOptions {
    startDate?: string;
    endDate?: string;
    eventType?: EventType;
    status?: EventStatus;
    limit?: number;
    offset?: number;
}

export interface GetMyEventsOptions {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface SearchEventsOptions {
    q: string;
    limit?: number;
    offset?: number;
}

export interface GetAttendeesOptions {
    status?: RSVPStatus;
    limit?: number;
    offset?: number;
}

export interface GetStatsOptions {
    startDate: string;
    endDate: string;
}

// ==================== Calendar Events Service ====================

export const calendarEventsService = {
    // ==================== Read Events ====================

    /**
     * Get events within a date range
     */
    getEvents: (options?: GetEventsOptions): Promise<EventsResponse> =>
        api.get<EventsResponse>('/calendar-events', { params: options }),

    /**
     * Get upcoming events (for widget)
     */
    getUpcomingEvents: (days?: number): Promise<CalendarEvent[]> =>
        api.get<CalendarEvent[]>('/calendar-events/upcoming', { params: { days } }),

    /**
     * Get user's events (created by or invited to)
     */
    getMyEvents: (options?: GetMyEventsOptions): Promise<EventsResponse> =>
        api.get<EventsResponse>('/calendar-events/my', { params: options }),

    /**
     * Search events by keyword
     */
    searchEvents: (options: SearchEventsOptions): Promise<EventsResponse> =>
        api.get<EventsResponse>('/calendar-events/search', { params: options }),

    /**
     * Get events statistics (HR/Admin only)
     */
    getEventsStats: (options: GetStatsOptions): Promise<EventsStatsResponse> =>
        api.get<EventsStatsResponse>('/calendar-events/stats', { params: options }),

    /**
     * Get single event details
     */
    getEvent: (eventId: string): Promise<CalendarEvent> =>
        api.get<CalendarEvent>(`/calendar-events/${eventId}`),

    /**
     * Get attendees for an event
     */
    getEventAttendees: (eventId: string, options?: GetAttendeesOptions): Promise<AttendeesResponse> =>
        api.get<AttendeesResponse>(`/calendar-events/${eventId}/attendees`, { params: options }),

    // ==================== Create & Update Events ====================

    /**
     * Create a new event
     */
    createEvent: (data: CreateEventDto): Promise<CalendarEvent> =>
        api.post<CalendarEvent>('/calendar-events', data),

    /**
     * Update an existing event
     */
    updateEvent: (eventId: string, data: UpdateEventDto): Promise<CalendarEvent> =>
        api.patch<CalendarEvent>(`/calendar-events/${eventId}`, data),

    // ==================== Cancel & Delete Events ====================

    /**
     * Cancel an event
     */
    cancelEvent: (eventId: string, reason?: string): Promise<CalendarEvent> =>
        api.post<CalendarEvent>(`/calendar-events/${eventId}/cancel`, null, { params: { reason } }),

    /**
     * Delete an event permanently (Admin only)
     */
    deleteEvent: (eventId: string): Promise<{ message: string }> =>
        api.delete<{ message: string }>(`/calendar-events/${eventId}`),

    /**
     * Mark event as done
     */
    markEventAsDone: (eventId: string): Promise<CalendarEvent> =>
        api.post<CalendarEvent>(`/calendar-events/${eventId}/mark-done`),

    // ==================== RSVP ====================

    /**
     * RSVP to an event
     */
    rsvpToEvent: (eventId: string, data: RSVPEventDto): Promise<EventAttendee> =>
        api.post<EventAttendee>(`/calendar-events/${eventId}/rsvp`, data),

    /**
     * Remove an attendee from event
     */
    removeAttendee: (eventId: string, attendeeUserId: string): Promise<{ message: string }> =>
        api.delete<{ message: string }>(`/calendar-events/${eventId}/attendees/${attendeeUserId}`),
};
