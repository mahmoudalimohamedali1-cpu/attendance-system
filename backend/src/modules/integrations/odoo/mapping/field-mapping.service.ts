import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface FieldMappingConfig {
    entityType: 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL';
    localField: string;
    odooField: string;
    odooModel: string;
    transformer?: string;
    config?: any;
    isRequired?: boolean;
    description?: string;
}

// Default field mappings
const DEFAULT_MAPPINGS: FieldMappingConfig[] = [
    // Employee mappings
    { entityType: 'EMPLOYEE', localField: 'firstName', odooField: 'name', odooModel: 'hr.employee', transformer: 'FIRST_NAME' },
    { entityType: 'EMPLOYEE', localField: 'lastName', odooField: 'name', odooModel: 'hr.employee', transformer: 'LAST_NAME' },
    { entityType: 'EMPLOYEE', localField: 'email', odooField: 'work_email', odooModel: 'hr.employee' },
    { entityType: 'EMPLOYEE', localField: 'phone', odooField: 'mobile_phone', odooModel: 'hr.employee' },
    { entityType: 'EMPLOYEE', localField: 'jobTitle', odooField: 'job_id.name', odooModel: 'hr.employee' },
    { entityType: 'EMPLOYEE', localField: 'departmentName', odooField: 'department_id.name', odooModel: 'hr.employee' },

    // Attendance mappings
    { entityType: 'ATTENDANCE', localField: 'checkInTime', odooField: 'check_in', odooModel: 'hr.attendance', transformer: 'DATETIME' },
    { entityType: 'ATTENDANCE', localField: 'checkOutTime', odooField: 'check_out', odooModel: 'hr.attendance', transformer: 'DATETIME' },

    // Leave mappings
    { entityType: 'LEAVE', localField: 'startDate', odooField: 'date_from', odooModel: 'hr.leave', transformer: 'DATE' },
    { entityType: 'LEAVE', localField: 'endDate', odooField: 'date_to', odooModel: 'hr.leave', transformer: 'DATE' },
    { entityType: 'LEAVE', localField: 'type', odooField: 'holiday_status_id.name', odooModel: 'hr.leave' },
    { entityType: 'LEAVE', localField: 'status', odooField: 'state', odooModel: 'hr.leave', transformer: 'LEAVE_STATUS' },

    // Payroll mappings
    { entityType: 'PAYROLL', localField: 'workedHours', odooField: 'number_of_hours', odooModel: 'hr.work.entry' },
    { entityType: 'PAYROLL', localField: 'workedDays', odooField: 'number_of_days', odooModel: 'hr.work.entry' },
];

@Injectable()
export class OdooFieldMappingService {
    private readonly logger = new Logger(OdooFieldMappingService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Initialize default mappings for a company
     */
    async initializeDefaults(companyId: string): Promise<number> {
        let created = 0;

        for (const mapping of DEFAULT_MAPPINGS) {
            const exists = await this.prisma.odooFieldMapping.findUnique({
                where: {
                    companyId_entityType_localField: {
                        companyId,
                        entityType: mapping.entityType,
                        localField: mapping.localField,
                    },
                },
            });

            if (!exists) {
                await this.prisma.odooFieldMapping.create({
                    data: {
                        companyId,
                        ...mapping,
                        config: mapping.config || {},
                    },
                });
                created++;
            }
        }

        this.logger.log(`Initialized ${created} default field mappings for company ${companyId}`);
        return created;
    }

    /**
     * Get mappings for an entity type
     */
    async getMappings(companyId: string, entityType: string) {
        return this.prisma.odooFieldMapping.findMany({
            where: { companyId, entityType, isActive: true },
            orderBy: { localField: 'asc' },
        });
    }

    /**
     * Get all mappings for a company
     */
    async getAllMappings(companyId: string) {
        return this.prisma.odooFieldMapping.findMany({
            where: { companyId },
            orderBy: [{ entityType: 'asc' }, { localField: 'asc' }],
        });
    }

    /**
     * Update a field mapping
     */
    async updateMapping(
        id: string,
        data: Partial<{
            odooField: string;
            transformer: string;
            config: any;
            isActive: boolean;
            description: string;
        }>,
    ) {
        return this.prisma.odooFieldMapping.update({
            where: { id },
            data,
        });
    }

    /**
     * Create a custom mapping
     */
    async createMapping(companyId: string, mapping: FieldMappingConfig) {
        return this.prisma.odooFieldMapping.create({
            data: {
                companyId,
                ...mapping,
                config: mapping.config || {},
            },
        });
    }

    /**
     * Delete a mapping
     */
    async deleteMapping(id: string) {
        return this.prisma.odooFieldMapping.delete({ where: { id } });
    }

    /**
     * Transform local data to Odoo format
     */
    async transformToOdoo(companyId: string, entityType: string, localData: any): Promise<any> {
        const mappings = await this.getMappings(companyId, entityType);
        const odooData: any = {};

        for (const mapping of mappings) {
            const localValue = localData[mapping.localField];
            if (localValue === undefined || localValue === null) continue;

            const transformedValue = this.applyTransformer(
                localValue,
                mapping.transformer,
                mapping.config,
                'TO_ODOO',
            );

            this.setNestedValue(odooData, mapping.odooField, transformedValue);
        }

        return odooData;
    }

    /**
     * Transform Odoo data to local format
     */
    async transformToLocal(companyId: string, entityType: string, odooData: any): Promise<any> {
        const mappings = await this.getMappings(companyId, entityType);
        const localData: any = {};

        for (const mapping of mappings) {
            const odooValue = this.getNestedValue(odooData, mapping.odooField);
            if (odooValue === undefined || odooValue === null) continue;

            const transformedValue = this.applyTransformer(
                odooValue,
                mapping.transformer,
                mapping.config,
                'TO_LOCAL',
            );

            localData[mapping.localField] = transformedValue;
        }

        return localData;
    }

    /**
     * Apply transformer to a value
     */
    private applyTransformer(
        value: any,
        transformer: string | null,
        config: any,
        direction: 'TO_ODOO' | 'TO_LOCAL',
    ): any {
        if (!transformer) return value;

        switch (transformer) {
            case 'DATETIME':
                if (direction === 'TO_ODOO') {
                    return new Date(value).toISOString().replace('T', ' ').slice(0, 19);
                } else {
                    return new Date(value);
                }

            case 'DATE':
                if (direction === 'TO_ODOO') {
                    return new Date(value).toISOString().slice(0, 10);
                } else {
                    return new Date(value);
                }

            case 'FIRST_NAME':
                if (direction === 'TO_ODOO') {
                    return value; // Will be combined elsewhere
                } else {
                    return value?.split(' ')[0] || value;
                }

            case 'LAST_NAME':
                if (direction === 'TO_ODOO') {
                    return value; // Will be combined elsewhere
                } else {
                    const parts = value?.split(' ') || [];
                    return parts.slice(1).join(' ') || '';
                }

            case 'LEAVE_STATUS':
                const statusMap = config?.statusMap || {
                    PENDING: 'draft',
                    APPROVED: 'validate',
                    REJECTED: 'refuse',
                    CANCELLED: 'cancel',
                };
                const reverseMap = Object.fromEntries(
                    Object.entries(statusMap).map(([k, v]) => [v, k]),
                );
                return direction === 'TO_ODOO' ? statusMap[value] || value : reverseMap[value] || value;

            case 'ENUM_MAP':
                const enumMap = config?.map || {};
                if (direction === 'TO_ODOO') {
                    return enumMap[value] || value;
                } else {
                    const reverse = Object.fromEntries(
                        Object.entries(enumMap).map(([k, v]) => [v, k]),
                    );
                    return reverse[value] || value;
                }

            default:
                return value;
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((acc, key) => {
            if (!acc[key]) acc[key] = {};
            return acc[key];
        }, obj);
        target[lastKey] = value;
    }
}
