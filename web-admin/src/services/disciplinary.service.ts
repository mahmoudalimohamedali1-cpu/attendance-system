import { api } from './api.service';

export interface DisciplinaryCase {
    id: string;
    caseCode: string;
    title: string;
    status: string;
    stage: string;
    incidentDate: string;
    employeeId: string;
    managerId: string;
    createdAt?: string;
    employee?: {
        firstName: string;
        lastName: string;
        employeeCode?: string;
    };
    manager?: {
        firstName: string;
        lastName: string;
    };
    events: any[];
    attachments?: any[];
    minutes?: any[];
    deadlines?: {
        decision: { date: string; daysRemaining: number; isExpired: boolean } | null;
        objection: { date: string; daysRemaining: number; isExpired: boolean } | null;
    };
    legalHold?: boolean;
    finalizedAt?: string;
    decisionType?: string;
    decisionReason?: string;
    decisionCreatedAt?: string;
    officialInvestigationOpenedAt?: string;
    decisionDeadlineDaysSnapshot?: number;
    objectionWindowDaysSnapshot?: number;
}

export const disciplinaryService = {
    // Create case (Manager)
    createCase: (data: any) => api.post('/disciplinary/cases', data),

    // Get cases list by role
    getCases: (role: 'manager' | 'hr' | 'employee' = 'hr') =>
        api.get(`/disciplinary/cases?role=${role}`),

    // Get single case details
    getCase: (id: string) => api.get(`/disciplinary/cases/${id}`),

    // HR Initial Review
    hrReview: (id: string, data: any) =>
        api.post(`/disciplinary/cases/${id}/hr-review`, data),

    // Employee informal response
    employeeResponse: (id: string, data: any) =>
        api.post(`/disciplinary/cases/${id}/employee-informal-response`, data),

    // Schedule hearing (HR)
    scheduleHearing: (id: string, data: { hearingDatetime: string; hearingLocation: string }) =>
        api.post(`/disciplinary/cases/${id}/schedule-hearing`, data),

    // Upload minutes (HR)
    uploadMinutes: (id: string, data: { sessionNo: number; minutesText?: string; minutesFileUrl?: string }) =>
        api.post(`/disciplinary/cases/${id}/minutes`, data),

    // Issue decision (HR)
    issueDecision: (id: string, data: any) =>
        api.post(`/disciplinary/cases/${id}/decision`, data),

    // Employee decision response (Accept/Object)
    employeeDecisionResponse: (id: string, data: { action: 'ACCEPT' | 'OBJECT'; objectionText?: string }) =>
        api.post(`/disciplinary/cases/${id}/employee-decision-response`, data),

    // HR objection review
    objectionReview: (id: string, data: { action: 'CANCEL' | 'CONTINUE' | 'CONFIRM'; reason: string }) =>
        api.post(`/disciplinary/cases/${id}/objection-review`, data),

    // Finalize case (HR)
    finalizeCase: (id: string) =>
        api.post(`/disciplinary/cases/${id}/finalize`, {}),

    // Toggle legal hold (HR)
    toggleLegalHold: (id: string, hold: boolean) =>
        api.post(`/disciplinary/cases/${id}/toggle-hold`, { hold }),

    // Upload attachment
    uploadAttachment: (id: string, data: { fileUrl: string; fileName: string; fileType: string }) =>
        api.post(`/disciplinary/cases/${id}/attachments`, data),

    // Legacy - kept for compatibility
    getInbox: (role: 'HR' | 'MANAGER' | 'EMPLOYEE') => {
        const roleMap: Record<string, string> = { HR: 'hr', MANAGER: 'manager', EMPLOYEE: 'employee' };
        return api.get(`/disciplinary/cases?role=${roleMap[role]}`);
    },
};

