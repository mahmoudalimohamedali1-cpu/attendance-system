export interface TravelRequest {
    id: string;
    userId: string;
    userName: string;
    destination: string;
    purpose: string;
    departureDate: Date;
    returnDate: Date;
    estimatedCost: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
    approver?: string;
    createdAt: Date;
}
export interface PerDiem {
    country: string;
    countryAr: string;
    currency: string;
    daily: number;
    hotel: number;
    meals: number;
    transport: number;
}
export interface VisaInfo {
    country: string;
    countryAr: string;
    required: boolean;
    type: string;
    processingDays: number;
    documents: string[];
    cost: number;
}
export interface TravelPolicy {
    rule: string;
    ruleAr: string;
    applies: boolean;
    details: string;
}
export declare class TravelExpensesService {
    private readonly logger;
    private requests;
    private readonly perDiemRates;
    private readonly visaInfo;
    createRequest(userId: string, userName: string, destination: string, purpose: string, departureDate: Date, returnDate: Date): TravelRequest;
    getPerDiem(country: string): PerDiem | null;
    getVisaInfo(country: string): VisaInfo | null;
    checkPolicy(request: TravelRequest): TravelPolicy[];
    formatTravelRequest(request: TravelRequest): string;
    formatPerDiem(country: string): string;
    formatVisaInfo(country: string): string;
    formatPolicyCheck(request: TravelRequest): string;
}
