import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
import { PermissionScope } from '@prisma/client';

export class AddUserPermissionDto {
    @ApiProperty({ description: 'كود الصلاحية', example: 'LEAVES_VIEW' })
    @IsString()
    permissionCode: string;

    @ApiProperty({ description: 'نطاق الصلاحية', enum: PermissionScope })
    @IsEnum(PermissionScope)
    scope: PermissionScope;

    @ApiProperty({ description: 'معرف الفرع (إذا كان النطاق BRANCH)', required: false })
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @ApiProperty({ description: 'معرف القسم (إذا كان النطاق DEPARTMENT)', required: false })
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiProperty({ description: 'معرفات الموظفين (إذا كان النطاق CUSTOM)', required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    employeeIds?: string[];
}

export class UpdatePermissionEmployeesDto {
    @ApiProperty({ description: 'معرفات الموظفين', type: [String] })
    @IsArray()
    @IsUUID('4', { each: true })
    employeeIds: string[];
}

export class BulkUpdatePermissionsDto {
    @ApiProperty({
        description: 'قائمة الصلاحيات مع نطاقاتها',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                permissionCode: { type: 'string' },
                scopes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            scope: { type: 'string', enum: Object.values(PermissionScope) },
                            branchId: { type: 'string', nullable: true },
                            departmentId: { type: 'string', nullable: true },
                            employeeIds: { type: 'array', items: { type: 'string' }, nullable: true },
                        },
                    },
                },
            },
        },
    })
    @IsArray()
    permissions: Array<{
        permissionCode: string;
        scopes: Array<{
            scope: PermissionScope;
            branchId?: string;
            departmentId?: string;
            employeeIds?: string[];
        }>;
    }>;
}

export class UpdateManagerDto {
    @ApiProperty({ description: 'معرف المدير المباشر', required: false })
    @IsOptional()
    @IsUUID()
    managerId?: string | null;
}
