export interface EmergencyContact {
    id: string;
    name: string;
    nameAr: string;
    type: 'internal' | 'external' | 'government';
    phone: string;
    available24h: boolean;
    priority: number;
}
export interface SafetyAlert {
    id: string;
    type: 'fire' | 'medical' | 'security' | 'weather' | 'other';
    typeAr: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    instructions: string[];
    active: boolean;
    createdAt: Date;
    expiresAt?: Date;
}
export interface IncidentReport {
    id: string;
    reporterId: string;
    reporterName: string;
    type: 'accident' | 'security' | 'harassment' | 'safety' | 'other';
    typeAr: string;
    description: string;
    location: string;
    severity: 'low' | 'medium' | 'high';
    status: 'reported' | 'investigating' | 'resolved' | 'closed';
    createdAt: Date;
    resolvedAt?: Date;
}
export interface EvacuationPlan {
    building: string;
    floor: string;
    assemblyPoint: string;
    routes: {
        from: string;
        to: string;
        instructions: string;
    }[];
    wardens: {
        name: string;
        phone: string;
        area: string;
    }[];
}
export declare class EmergencyService {
    private readonly logger;
    private readonly contacts;
    private alerts;
    private incidents;
    getContacts(type?: EmergencyContact['type']): EmergencyContact[];
    createAlert(type: SafetyAlert['type'], severity: SafetyAlert['severity'], title: string, message: string, instructions: string[], hoursToExpire?: number): SafetyAlert;
    getActiveAlerts(): SafetyAlert[];
    reportIncident(reporterId: string, reporterName: string, type: IncidentReport['type'], description: string, location: string, severity: IncidentReport['severity']): IncidentReport;
    getEvacuationPlan(building?: string): EvacuationPlan;
    formatContacts(): string;
    formatAlerts(): string;
    formatEvacuationPlan(): string;
    formatIncidentConfirmation(incident: IncidentReport): string;
}
