import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Odoo Employee Response
export class OdooEmployeeDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional()
    workEmail?: string;

    @ApiPropertyOptional()
    mobilePhone?: string;

    @ApiPropertyOptional()
    workPhone?: string;

    @ApiPropertyOptional()
    departmentId?: number;

    @ApiPropertyOptional()
    departmentName?: string;

    @ApiPropertyOptional()
    jobId?: number;

    @ApiPropertyOptional()
    jobTitle?: string;

    @ApiPropertyOptional()
    managerId?: number;

    @ApiPropertyOptional()
    managerName?: string;

    @ApiPropertyOptional()
    employeeType?: string;

    @ApiPropertyOptional()
    active?: boolean;
}

// Sync Employees Request
export class SyncEmployeesDto {
    @ApiPropertyOptional({ description: 'Only sync active employees', default: true })
    activeOnly?: boolean = true;

    @ApiPropertyOptional({ description: 'Department ID to filter' })
    departmentId?: number;

    @ApiPropertyOptional({ description: 'Create new users for unmapped employees', default: false })
    createNewUsers?: boolean = false;

    @ApiPropertyOptional({ description: 'Who triggered the sync' })
    triggeredBy?: 'USER' | 'SCHEDULED' | 'WEBHOOK';
}

// Employee Mapping
export class OdooEmployeeMappingDto {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    odooEmployeeId: number;
}

// Bulk Import Result
export class EmployeeImportResultDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    imported: number;

    @ApiProperty()
    updated: number;

    @ApiProperty()
    skipped: number;

    @ApiProperty()
    errors: { odooId: number; error: string }[];
}
