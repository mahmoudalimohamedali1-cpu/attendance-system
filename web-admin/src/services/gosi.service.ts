/**
 * GOSI (Social Insurance) API Service
 * التأمينات الاجتماعية
 * 
 * Fixed: Field name mapping between Backend and Frontend
 * Backend uses: employeeRate, employerRate, sanedRate, hazardRate, maxCapAmount
 * Frontend was expecting: employeePercentage, employerPercentage, maxSalary
 */

import { api } from './api.service';

// Backend response interface (actual DB fields)
interface GosiConfigRaw {
    id: string;
    employeeRate: number;  // 9%
    employerRate: number;  // 9%
    sanedRate: number;     // 0.75%
    hazardRate: number;    // 2%
    maxCapAmount: number;  // 45000
    effectiveDate: string;
    isActive: boolean;
    createdAt: string;
}

// Frontend-friendly interface (computed values)
export interface GosiConfig {
    id: string;
    employeePercentage: number;  // employeeRate + sanedRate = 9.75%
    employerPercentage: number;  // employerRate + sanedRate + hazardRate = 11.75%
    maxSalary: number;           // maxCapAmount
    effectiveFrom: string;       // effectiveDate
    isActive: boolean;
    createdAt: string;
    // Also expose raw values for advanced UI
    employeeRate?: number;
    employerRate?: number;
    sanedRate?: number;
    hazardRate?: number;
}

export interface CreateGosiConfigDto {
    employeePercentage: number;
    employerPercentage: number;
    maxSalary: number;
    effectiveFrom: string;
}

// Transform backend response to frontend format
function transformConfig(raw: GosiConfigRaw): GosiConfig {
    const employeeRate = Number(raw.employeeRate) || 0;
    const employerRate = Number(raw.employerRate) || 0;
    const sanedRate = Number(raw.sanedRate) || 0;
    const hazardRate = Number(raw.hazardRate) || 0;

    return {
        id: raw.id,
        employeePercentage: employeeRate + sanedRate,  // 9 + 0.75 = 9.75
        employerPercentage: employerRate + sanedRate + hazardRate,  // 9 + 0.75 + 2 = 11.75
        maxSalary: Number(raw.maxCapAmount) || 45000,
        effectiveFrom: raw.effectiveDate,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        // Include raw values
        employeeRate,
        employerRate,
        sanedRate,
        hazardRate,
    };
}

class GosiService {
    private readonly basePath = '/gosi';

    async getActiveConfig(): Promise<GosiConfig | null> {
        try {
            const response = await api.get(`${this.basePath}/config/active`) as GosiConfigRaw | { data: GosiConfigRaw } | null;
            if (!response) return null;
            const raw = (response as any).data || response;
            if (!raw || !raw.id) return null;
            return transformConfig(raw);
        } catch {
            return null;
        }
    }

    async getAll(): Promise<GosiConfig[]> {
        const response = await api.get(`${this.basePath}/configs`) as GosiConfigRaw[] | { data: GosiConfigRaw[] };
        const rawList = (response as any).data || response || [];
        return rawList.map(transformConfig);
    }

    async create(data: CreateGosiConfigDto): Promise<GosiConfig> {
        // Transform frontend format to backend format
        const backendData = {
            employeeRate: 9.00,  // Fixed rate
            employerRate: 9.00,  // Fixed rate
            sanedRate: 0.75,     // Fixed rate
            hazardRate: 2.00,    // Fixed rate
            maxCapAmount: data.maxSalary,
            effectiveDate: data.effectiveFrom,
            isActive: true,
        };
        const response = await api.post(`${this.basePath}/config`, backendData) as GosiConfigRaw | { data: GosiConfigRaw };
        const raw = (response as any).data || response;
        return transformConfig(raw);
    }

    async update(id: string, data: Partial<CreateGosiConfigDto>): Promise<GosiConfig> {
        // Transform frontend format to backend format
        const backendData: any = {};
        if (data.maxSalary !== undefined) backendData.maxCapAmount = data.maxSalary;
        if (data.effectiveFrom !== undefined) backendData.effectiveDate = data.effectiveFrom;
        // For now, keep rates fixed (can be extended later)

        const response = await api.patch(`${this.basePath}/config/${id}`, backendData) as GosiConfigRaw | { data: GosiConfigRaw };
        const raw = (response as any).data || response;
        return transformConfig(raw);
    }
}

export const gosiService = new GosiService();
