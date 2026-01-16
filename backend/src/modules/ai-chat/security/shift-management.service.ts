import { Injectable, Logger } from '@nestjs/common';

/**
 * 🔄 Shift Management Service
 * Implements idea #38: Shift swapper
 * 
 * Features:
 * - Request shift swap with colleague
 * - Auto-match available swaps
 * - Approval workflow
 */

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

@Injectable()
export class ShiftManagementService {
    private readonly logger = new Logger(ShiftManagementService.name);

    // In-memory swap requests
    private swapRequests: Map<string, ShiftSwapRequest> = new Map();

    /**
     * 🔄 Request shift swap
     */
    requestSwap(
        userId: string,
        userName: string,
        shiftDate: Date,
        shiftType: string,
        reason?: string
    ): { success: boolean; requestId: string; message: string } {
        const requestId = `swap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const request: ShiftSwapRequest = {
            id: requestId,
            requesterId: userId,
            requesterName: userName,
            requesterShiftDate: shiftDate,
            requesterShiftType: shiftType,
            status: 'pending',
            reason,
            createdAt: new Date(),
        };

        this.swapRequests.set(requestId, request);

        return {
            success: true,
            requestId,
            message: '✅ تم إنشاء طلب التبديل!\n\n⏳ سيتم إشعارك عند توفر موظف للتبديل.',
        };
    }

    /**
     * 📨 Send swap request to specific employee
     */
    sendSwapRequest(
        requestId: string,
        targetId: string,
        targetName: string
    ): { success: boolean; message: string } {
        const request = this.swapRequests.get(requestId);

        if (!request) {
            return { success: false, message: '❌ لم يتم العثور على الطلب' };
        }

        request.targetId = targetId;
        request.targetName = targetName;
        request.status = 'matched';

        return {
            success: true,
            message: `✅ تم إرسال طلب التبديل إلى ${targetName}\n\n⏳ بانتظار موافقتهم`,
        };
    }

    /**
     * ✅ Approve swap request
     */
    approveSwap(requestId: string, approverId: string): { success: boolean; message: string } {
        const request = this.swapRequests.get(requestId);

        if (!request) {
            return { success: false, message: '❌ لم يتم العثور على الطلب' };
        }

        if (request.targetId !== approverId) {
            return { success: false, message: '❌ ليس لديك صلاحية الموافقة على هذا الطلب' };
        }

        request.status = 'approved';

        return {
            success: true,
            message: `✅ تمت الموافقة على تبديل الشفت!\n\n📅 ${request.requesterName} ↔️ ${request.targetName}\n📆 التاريخ: ${request.requesterShiftDate.toLocaleDateString('ar-SA')}`,
        };
    }

    /**
     * ❌ Reject swap request
     */
    rejectSwap(requestId: string): { success: boolean; message: string } {
        const request = this.swapRequests.get(requestId);

        if (!request) {
            return { success: false, message: '❌ لم يتم العثور على الطلب' };
        }

        request.status = 'rejected';

        return {
            success: true,
            message: '❌ تم رفض طلب التبديل',
        };
    }

    /**
     * 📋 Get user's swap requests
     */
    getUserSwapRequests(userId: string): ShiftSwapRequest[] {
        const requests: ShiftSwapRequest[] = [];

        for (const [, request] of this.swapRequests) {
            if (request.requesterId === userId || request.targetId === userId) {
                requests.push(request);
            }
        }

        return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * 📊 Format swap requests as message
     */
    formatSwapRequests(userId: string): string {
        const requests = this.getUserSwapRequests(userId);

        if (requests.length === 0) {
            return '📋 لا توجد طلبات تبديل شفت حالياً.\n\nلإنشاء طلب جديد:\n"أبغى أبدل شفتي يوم [التاريخ]"';
        }

        let message = '📋 **طلبات تبديل الشفت:**\n\n';

        for (const req of requests.slice(0, 5)) {
            const isRequester = req.requesterId === userId;
            const statusEmoji = {
                pending: '⏳',
                matched: '🔄',
                approved: '✅',
                rejected: '❌',
                completed: '🎉',
            }[req.status];

            message += `${statusEmoji} ${req.requesterShiftDate.toLocaleDateString('ar-SA')}\n`;
            message += `   ${isRequester ? 'طلبك' : 'طلب من ' + req.requesterName}\n`;
            if (req.targetName && !isRequester) {
                message += `   ← مع ${req.targetName}\n`;
            }
            message += '\n';
        }

        return message;
    }

    /**
     * 📊 Get service stats
     */
    getStats(): { total: number; pending: number; approved: number } {
        let pending = 0;
        let approved = 0;

        for (const [, req] of this.swapRequests) {
            if (req.status === 'pending' || req.status === 'matched') pending++;
            if (req.status === 'approved') approved++;
        }

        return { total: this.swapRequests.size, pending, approved };
    }
}
