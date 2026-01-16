export interface CulturalEvent {
    id: string;
    name: string;
    nameAr: string;
    date: Date;
    endDate?: Date;
    type: 'islamic' | 'national' | 'international' | 'company';
    typeAr: string;
    description: string;
    isHoliday: boolean;
    affectedCountries: string[];
}
export interface ExpatService {
    id: string;
    name: string;
    nameAr: string;
    category: 'visa' | 'housing' | 'banking' | 'healthcare' | 'education' | 'driving';
    categoryAr: string;
    description: string;
    steps: string[];
    documents: string[];
    estimatedTime: string;
    contact?: string;
}
export interface TimeZoneInfo {
    city: string;
    cityAr: string;
    timezone: string;
    offset: number;
    currentTime: string;
}
export declare class MultiCulturalService {
    private readonly logger;
    private readonly culturalEvents;
    private readonly expatServices;
    private readonly dialectPatterns;
    getUpcomingEvents(days?: number, country?: string): CulturalEvent[];
    getRamadanStatus(): {
        isRamadan: boolean;
        daysUntil?: number;
        daysRemaining?: number;
        message: string;
    };
    detectDialect(text: string): {
        dialect: string;
        dialectAr: string;
        confidence: number;
    };
    getExpatService(serviceId: string): ExpatService | null;
    searchExpatServices(query: string): ExpatService[];
    getWorldTimes(): TimeZoneInfo[];
    formatUpcomingEvents(country?: string): string;
    formatExpatServices(): string;
    formatExpatServiceDetails(service: ExpatService): string;
}
