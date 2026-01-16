export interface ShiftSwapRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    targetId?: string;
    targetName?: string;
    requesterShiftDate: Date;
    requesterShiftType: string;
    status: 'pending' | 'matched' | 'approved' | 'rejected' | 'completed';
    reason?: string;
    createdAt: Date;
}
export interface ShiftMatch {
    employeeId: string;
    employeeName: string;
    shiftDate: Date;
    shiftType: string;
    compatibility: number;
}
export declare class ShiftManagementService {
    private readonly logger;
    private swapRequests;
    requestSwap(userId: string, userName: string, shiftDate: Date, shiftType: string, reason?: string): {
        success: boolean;
        requestId: string;
        message: string;
    };
    sendSwapRequest(requestId: string, targetId: string, targetName: string): {
        success: boolean;
        message: string;
    };
    approveSwap(requestId: string, approverId: string): {
        success: boolean;
        message: string;
    };
    rejectSwap(requestId: string): {
        success: boolean;
        message: string;
    };
    getUserSwapRequests(userId: string): ShiftSwapRequest[];
    formatSwapRequests(userId: string): string;
    getStats(): {
        total: number;
        pending: number;
        approved: number;
    };
}
