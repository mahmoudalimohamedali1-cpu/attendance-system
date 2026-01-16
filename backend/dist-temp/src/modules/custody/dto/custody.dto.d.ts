export declare class CreateCategoryCto {
    name: string;
    nameEn?: string;
    description?: string;
    icon?: string;
    requiresApproval?: boolean;
    requiresSerialNumber?: boolean;
    depreciationYears?: number;
}
export declare class UpdateCategoryCto {
    name?: string;
    nameEn?: string;
    description?: string;
    icon?: string;
    requiresApproval?: boolean;
    requiresSerialNumber?: boolean;
    depreciationYears?: number;
    isActive?: boolean;
}
export declare class CreateItemDto {
    categoryId: string;
    code: string;
    name: string;
    nameEn?: string;
    description?: string;
    serialNumber?: string;
    model?: string;
    brand?: string;
    barcode?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyExpiry?: string;
    vendor?: string;
    invoiceNumber?: string;
    currentLocation?: string;
    notes?: string;
    imageUrl?: string;
    branchId?: string;
    condition?: string;
}
export declare class UpdateItemDto {
    categoryId?: string;
    code?: string;
    name?: string;
    nameEn?: string;
    description?: string;
    serialNumber?: string;
    model?: string;
    brand?: string;
    barcode?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyExpiry?: string;
    vendor?: string;
    invoiceNumber?: string;
    status?: string;
    condition?: string;
    currentLocation?: string;
    notes?: string;
    imageUrl?: string;
    branchId?: string;
}
export declare class AssignCustodyDto {
    custodyItemId: string;
    employeeId: string;
    expectedReturn?: string;
    conditionOnAssign?: string;
    notes?: string;
    attachments?: any[];
}
export declare class ApproveAssignmentDto {
    assignmentId: string;
    notes?: string;
}
export declare class RejectAssignmentDto {
    assignmentId: string;
    reason: string;
}
export declare class SignAssignmentDto {
    assignmentId: string;
    signature: string;
}
export declare class RequestReturnDto {
    assignmentId: string;
    returnReason?: string;
    conditionOnReturn: string;
    damageDescription?: string;
    attachments?: any[];
}
export declare class ReviewReturnDto {
    returnId: string;
    decision: string;
    reviewNotes?: string;
    estimatedCost?: number;
    chargeEmployee?: boolean;
}
export declare class RequestTransferDto {
    custodyItemId: string;
    toEmployeeId: string;
    reason?: string;
    notes?: string;
}
export declare class ApproveTransferDto {
    transferId: string;
    signature?: string;
    notes?: string;
}
export declare class RejectTransferDto {
    transferId: string;
    reason: string;
}
export declare class CreateMaintenanceDto {
    custodyItemId: string;
    type: string;
    description: string;
    estimatedCost?: number;
    vendor?: string;
    vendorContact?: string;
    vendorEmail?: string;
    attachments?: any[];
}
export declare class UpdateMaintenanceDto {
    status?: string;
    actualCost?: number;
    result?: string;
    conditionAfter?: string;
    invoiceNumber?: string;
    attachments?: any[];
}
export declare class CustodyQueryDto {
    status?: string;
    categoryId?: string;
    branchId?: string;
    employeeId?: string;
    search?: string;
    page?: number;
    limit?: number;
}
