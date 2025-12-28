import { api } from './api.service';

export interface CustodyCategory {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    icon?: string;
    requiresApproval: boolean;
    requiresSerialNumber: boolean;
    depreciationYears?: number;
    isActive: boolean;
    _count?: { items: number };
    createdAt: string;
}

export interface CustodyItem {
    id: string;
    code: string;
    name: string;
    nameEn?: string;
    description?: string;
    serialNumber?: string;
    model?: string;
    brand?: string;
    barcode?: string;
    qrCode?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyExpiry?: string;
    vendor?: string;
    invoiceNumber?: string;
    status: 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'LOST' | 'DAMAGED' | 'DISPOSED' | 'RESERVED';
    condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    currentLocation?: string;
    notes?: string;
    imageUrl?: string;
    categoryId: string;
    category?: CustodyCategory;
    branchId?: string;
    branch?: { id: string; name: string };
    currentAssigneeId?: string;
    currentAssignee?: { id: string; firstName: string; lastName: string };
    assignments?: CustodyAssignment[];
    maintenances?: CustodyMaintenance[];
    createdAt: string;
}

export interface CustodyAssignment {
    id: string;
    custodyItemId: string;
    custodyItem?: CustodyItem;
    employeeId: string;
    employee?: { id: string; firstName: string; lastName: string; employeeCode?: string };
    assignedAt: string;
    expectedReturn?: string;
    actualReturn?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELIVERED' | 'RETURNED' | 'TRANSFERRED';
    conditionOnAssign?: string;
    conditionOnReturn?: string;
    assignedById: string;
    assignedBy?: { id: string; firstName: string; lastName: string };
    employeeSignature?: string;
    signatureDate?: string;
    notes?: string;
}

export interface CustodyReturn {
    id: string;
    custodyItemId: string;
    custodyItem?: CustodyItem;
    assignmentId: string;
    returnedById: string;
    returnedBy?: { id: string; firstName: string; lastName: string; employeeCode?: string };
    returnDate: string;
    returnReason?: string;
    conditionOnReturn: string;
    status: 'PENDING' | 'INSPECTING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    damageDescription?: string;
    estimatedCost?: number;
    chargeEmployee?: boolean;
    reviewedById?: string;
    reviewedBy?: { id: string; firstName: string; lastName: string };
    reviewedAt?: string;
    reviewNotes?: string;
}

export interface CustodyTransfer {
    id: string;
    custodyItemId: string;
    custodyItem?: CustodyItem;
    fromEmployeeId: string;
    fromEmployee?: { id: string; firstName: string; lastName: string; employeeCode?: string };
    toEmployeeId: string;
    toEmployee?: { id: string; firstName: string; lastName: string; employeeCode?: string };
    transferDate: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    notes?: string;
}

export interface CustodyMaintenance {
    id: string;
    custodyItemId: string;
    custodyItem?: CustodyItem;
    type: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    description: string;
    reportedAt: string;
    reportedById: string;
    reportedBy?: { id: string; firstName: string; lastName: string };
    startedAt?: string;
    completedAt?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANNOT_REPAIR';
    estimatedCost?: number;
    actualCost?: number;
    vendor?: string;
    vendorContact?: string;
    vendorEmail?: string;
    invoiceNumber?: string;
    result?: string;
    conditionAfter?: string;
}

export interface CustodyDashboard {
    summary: {
        total: number;
        available: number;
        assigned: number;
        maintenance: number;
        lost: number;
    };
    categoryStats: Array<CustodyCategory & { _count: { items: number } }>;
    recentAssignments: CustodyAssignment[];
    pendingReturns: number;
}

export interface CustodyQuery {
    status?: string;
    categoryId?: string;
    branchId?: string;
    employeeId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

const custodyService = {
    // ==================== Categories ====================
    getCategories: (): Promise<CustodyCategory[]> => {
        return api.get<CustodyCategory[]>('/custody/categories');
    },

    createCategory: (data: Partial<CustodyCategory>): Promise<CustodyCategory> => {
        return api.post<CustodyCategory>('/custody/categories', data);
    },

    updateCategory: (id: string, data: Partial<CustodyCategory>): Promise<CustodyCategory> => {
        return api.patch<CustodyCategory>(`/custody/categories/${id}`, data);
    },

    deleteCategory: (id: string): Promise<void> => {
        return api.delete(`/custody/categories/${id}`);
    },

    // ==================== Items ====================
    getItems: (query?: CustodyQuery): Promise<{ items: CustodyItem[]; total: number; page: number; limit: number }> => {
        return api.get('/custody/items', { params: query });
    },

    getItemById: (id: string): Promise<CustodyItem> => {
        return api.get<CustodyItem>(`/custody/items/${id}`);
    },

    createItem: (data: Partial<CustodyItem>): Promise<CustodyItem> => {
        return api.post<CustodyItem>('/custody/items', data);
    },

    updateItem: (id: string, data: Partial<CustodyItem>): Promise<CustodyItem> => {
        return api.patch<CustodyItem>(`/custody/items/${id}`, data);
    },

    deleteItem: (id: string): Promise<void> => {
        return api.delete(`/custody/items/${id}`);
    },

    // ==================== Assignments ====================
    getPendingAssignments: (): Promise<CustodyAssignment[]> => {
        return api.get<CustodyAssignment[]>('/custody/assignments/pending');
    },

    assignCustody: (data: { custodyItemId: string; employeeId: string; expectedReturn?: string; conditionOnAssign?: string; notes?: string }): Promise<CustodyAssignment> => {
        return api.post<CustodyAssignment>('/custody/assign', data);
    },

    approveAssignment: (assignmentId: string, notes?: string): Promise<void> => {
        return api.post('/custody/assignments/approve', { assignmentId, notes });
    },

    rejectAssignment: (assignmentId: string, reason: string): Promise<void> => {
        return api.post('/custody/assignments/reject', { assignmentId, reason });
    },

    // ==================== Returns ====================
    getPendingReturns: (): Promise<CustodyReturn[]> => {
        return api.get<CustodyReturn[]>('/custody/returns/pending');
    },

    reviewReturn: (data: { returnId: string; decision: 'APPROVED' | 'REJECTED'; reviewNotes?: string; estimatedCost?: number; chargeEmployee?: boolean }): Promise<void> => {
        return api.post('/custody/return/review', data);
    },

    // ==================== Transfers ====================
    getPendingTransfers: (): Promise<CustodyTransfer[]> => {
        return api.get<CustodyTransfer[]>('/custody/transfers/all-pending');
    },

    // ==================== Maintenance ====================
    getMaintenances: (status?: string): Promise<CustodyMaintenance[]> => {
        return api.get<CustodyMaintenance[]>('/custody/maintenance', { params: { status } });
    },

    createMaintenance: (data: Partial<CustodyMaintenance>): Promise<CustodyMaintenance> => {
        return api.post<CustodyMaintenance>('/custody/maintenance', data);
    },

    updateMaintenance: (id: string, data: Partial<CustodyMaintenance>): Promise<CustodyMaintenance> => {
        return api.patch<CustodyMaintenance>(`/custody/maintenance/${id}`, data);
    },

    // ==================== Dashboard & Reports ====================
    getDashboard: (): Promise<CustodyDashboard> => {
        return api.get<CustodyDashboard>('/custody/dashboard');
    },

    getEmployeeReport: (employeeId: string): Promise<{ current: CustodyAssignment[]; history: CustodyAssignment[]; totalValue: number }> => {
        return api.get(`/custody/reports/employee/${employeeId}`);
    },
};

export default custodyService;

