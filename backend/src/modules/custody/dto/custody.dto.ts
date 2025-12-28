import { IsString, IsOptional, IsBoolean, IsInt, Min, IsEnum, IsNumber, IsDateString, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Category DTOs ====================

export class CreateCategoryCto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    nameEn?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsBoolean()
    requiresApproval?: boolean;

    @IsOptional()
    @IsBoolean()
    requiresSerialNumber?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    depreciationYears?: number;
}

export class UpdateCategoryCto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    nameEn?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsBoolean()
    requiresApproval?: boolean;

    @IsOptional()
    @IsBoolean()
    requiresSerialNumber?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    depreciationYears?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ==================== Item DTOs ====================

export class CreateItemDto {
    @IsUUID()
    categoryId: string;

    @IsString()
    code: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    nameEn?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    serialNumber?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @IsNumber()
    purchasePrice?: number;

    @IsOptional()
    @IsDateString()
    warrantyExpiry?: string;

    @IsOptional()
    @IsString()
    vendor?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsString()
    currentLocation?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsEnum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
    condition?: string;
}

export class UpdateItemDto {
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    nameEn?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    serialNumber?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @IsNumber()
    purchasePrice?: number;

    @IsOptional()
    @IsDateString()
    warrantyExpiry?: string;

    @IsOptional()
    @IsString()
    vendor?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'LOST', 'DAMAGED', 'DISPOSED', 'RESERVED'])
    status?: string;

    @IsOptional()
    @IsEnum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
    condition?: string;

    @IsOptional()
    @IsString()
    currentLocation?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsUUID()
    branchId?: string;
}

// ==================== Assignment DTOs ====================

export class AssignCustodyDto {
    @IsUUID()
    custodyItemId: string;

    @IsUUID()
    employeeId: string;

    @IsOptional()
    @IsDateString()
    expectedReturn?: string;

    @IsOptional()
    @IsEnum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
    conditionOnAssign?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    attachments?: any[];
}

export class ApproveAssignmentDto {
    @IsUUID()
    assignmentId: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class RejectAssignmentDto {
    @IsUUID()
    assignmentId: string;

    @IsString()
    reason: string;
}

export class SignAssignmentDto {
    @IsUUID()
    assignmentId: string;

    @IsString()
    signature: string; // Base64 encoded signature
}

// ==================== Return DTOs ====================

export class RequestReturnDto {
    @IsUUID()
    assignmentId: string;

    @IsOptional()
    @IsString()
    returnReason?: string;

    @IsEnum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
    conditionOnReturn: string;

    @IsOptional()
    @IsString()
    damageDescription?: string;

    @IsOptional()
    @IsArray()
    attachments?: any[];
}

export class ReviewReturnDto {
    @IsUUID()
    returnId: string;

    @IsEnum(['APPROVED', 'REJECTED'])
    decision: string;

    @IsOptional()
    @IsString()
    reviewNotes?: string;

    @IsOptional()
    @IsNumber()
    estimatedCost?: number;

    @IsOptional()
    @IsBoolean()
    chargeEmployee?: boolean;
}

// ==================== Transfer DTOs ====================

export class RequestTransferDto {
    @IsUUID()
    custodyItemId: string;

    @IsUUID()
    toEmployeeId: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class ApproveTransferDto {
    @IsUUID()
    transferId: string;

    @IsOptional()
    @IsString()
    signature?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class RejectTransferDto {
    @IsUUID()
    transferId: string;

    @IsString()
    reason: string;
}

// ==================== Maintenance DTOs ====================

export class CreateMaintenanceDto {
    @IsUUID()
    custodyItemId: string;

    @IsEnum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'])
    type: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsNumber()
    estimatedCost?: number;

    @IsOptional()
    @IsString()
    vendor?: string;

    @IsOptional()
    @IsString()
    vendorContact?: string;

    @IsOptional()
    @IsString()
    vendorEmail?: string;

    @IsOptional()
    @IsArray()
    attachments?: any[];
}

export class UpdateMaintenanceDto {
    @IsOptional()
    @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANNOT_REPAIR'])
    status?: string;

    @IsOptional()
    @IsNumber()
    actualCost?: number;

    @IsOptional()
    @IsString()
    result?: string;

    @IsOptional()
    @IsEnum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
    conditionAfter?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsArray()
    attachments?: any[];
}

// ==================== Query DTOs ====================

export class CustodyQueryDto {
    @IsOptional()
    @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'LOST', 'DAMAGED', 'DISPOSED', 'RESERVED'])
    status?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number = 20;
}
