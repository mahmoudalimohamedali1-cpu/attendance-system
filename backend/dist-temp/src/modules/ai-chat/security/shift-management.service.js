"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ShiftManagementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftManagementService = void 0;
const common_1 = require("@nestjs/common");
let ShiftManagementService = ShiftManagementService_1 = class ShiftManagementService {
    constructor() {
        this.logger = new common_1.Logger(ShiftManagementService_1.name);
        this.swapRequests = new Map();
    }
    requestSwap(userId, userName, shiftDate, shiftType, reason) {
        const requestId = `swap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const request = {
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
    sendSwapRequest(requestId, targetId, targetName) {
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
    approveSwap(requestId, approverId) {
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
    rejectSwap(requestId) {
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
    getUserSwapRequests(userId) {
        const requests = [];
        for (const [, request] of this.swapRequests) {
            if (request.requesterId === userId || request.targetId === userId) {
                requests.push(request);
            }
        }
        return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    formatSwapRequests(userId) {
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
    getStats() {
        let pending = 0;
        let approved = 0;
        for (const [, req] of this.swapRequests) {
            if (req.status === 'pending' || req.status === 'matched')
                pending++;
            if (req.status === 'approved')
                approved++;
        }
        return { total: this.swapRequests.size, pending, approved };
    }
};
exports.ShiftManagementService = ShiftManagementService;
exports.ShiftManagementService = ShiftManagementService = ShiftManagementService_1 = __decorate([
    (0, common_1.Injectable)()
], ShiftManagementService);
//# sourceMappingURL=shift-management.service.js.map