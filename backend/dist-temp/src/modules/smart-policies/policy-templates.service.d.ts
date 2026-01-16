import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
export interface TemplateFilter {
    category?: string;
    search?: string;
    isPublic?: boolean;
}
export interface UseTemplateResult {
    policyId: string;
    message: string;
}
export declare class PolicyTemplatesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getTemplates(filters?: TemplateFilter): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        category: string;
        isPublic: boolean;
        originalText: string;
        parsedRule: import("@prisma/client/runtime/library").JsonValue;
        usageCount: number;
        createdBy: string | null;
        legalCompliance: import("@prisma/client/runtime/library").JsonValue;
        laborLawArticles: string[];
        rating: Decimal | null;
        ratingCount: number;
        isSystemTemplate: boolean;
    }[]>;
    getTemplate(templateId: string): Promise<{
        id: string;
        name: string;
        nameEn: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        category: string;
        isPublic: boolean;
        originalText: string;
        parsedRule: import("@prisma/client/runtime/library").JsonValue;
        usageCount: number;
        createdBy: string | null;
        legalCompliance: import("@prisma/client/runtime/library").JsonValue;
        laborLawArticles: string[];
        rating: Decimal | null;
        ratingCount: number;
        isSystemTemplate: boolean;
    }>;
    useTemplate(templateId: string, companyId: string, userId: string): Promise<UseTemplateResult>;
    rateTemplate(templateId: string, rating: number): Promise<{
        rating: number;
        ratingCount: number;
    }>;
    getCategories(): Promise<{
        category: string;
        labelAr: string;
        count: number;
    }[]>;
    seedTemplates(): Promise<{
        seeded: boolean;
        count: number;
    }>;
}
