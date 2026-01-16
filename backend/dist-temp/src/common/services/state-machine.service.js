"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachineService = void 0;
const common_1 = require("@nestjs/common");
const MUDAD_TRANSITIONS = {
    PENDING: ['PREPARED'],
    PREPARED: ['SUBMITTED', 'PENDING', 'RESUBMIT_REQUIRED'],
    SUBMITTED: ['ACCEPTED', 'REJECTED', 'RESUBMIT_REQUIRED'],
    ACCEPTED: [],
    REJECTED: ['RESUBMITTED'],
    RESUBMITTED: ['ACCEPTED', 'REJECTED'],
    RESUBMIT_REQUIRED: ['PREPARED'],
};
const WPS_TRANSITIONS = {
    GENERATED: ['DOWNLOADED', 'FAILED'],
    DOWNLOADED: ['SUBMITTED', 'GENERATED'],
    SUBMITTED: ['PROCESSING', 'FAILED'],
    PROCESSING: ['PROCESSED', 'FAILED'],
    PROCESSED: [],
    FAILED: ['GENERATED'],
};
let StateMachineService = class StateMachineService {
    validateMudadTransition(fromStatus, toStatus) {
        const allowedTransitions = MUDAD_TRANSITIONS[fromStatus];
        if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
            throw new common_1.BadRequestException(`لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}". ` +
                `التحويلات المسموحة: ${allowedTransitions?.join(', ') || 'لا يوجد'}`);
        }
    }
    validateWpsTransition(fromStatus, toStatus) {
        const allowedTransitions = WPS_TRANSITIONS[fromStatus];
        if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
            throw new common_1.BadRequestException(`لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}". ` +
                `التحويلات المسموحة: ${allowedTransitions?.join(', ') || 'لا يوجد'}`);
        }
    }
    getMudadAllowedTransitions(currentStatus) {
        return MUDAD_TRANSITIONS[currentStatus] || [];
    }
    getWpsAllowedTransitions(currentStatus) {
        return WPS_TRANSITIONS[currentStatus] || [];
    }
    isFinalMudadStatus(status) {
        return MUDAD_TRANSITIONS[status]?.length === 0;
    }
    isFinalWpsStatus(status) {
        return WPS_TRANSITIONS[status]?.length === 0;
    }
};
exports.StateMachineService = StateMachineService;
exports.StateMachineService = StateMachineService = __decorate([
    (0, common_1.Injectable)()
], StateMachineService);
//# sourceMappingURL=state-machine.service.js.map