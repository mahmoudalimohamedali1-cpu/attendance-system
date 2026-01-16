"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalWorkflowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
let ApprovalWorkflowService = class ApprovalWorkflowService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getApprovalChain(context) {
        const configs = await this.prisma.approvalChainConfig.findMany({
            where: {
                companyId: context.companyId,
                requestType: context.requestType,
                isActive: true,
            },
            orderBy: { priority: 'desc' },
        });
        for (const config of configs) {
            let matches = true;
            if (config.minAmount && context.amount !== undefined) {
                if (context.amount < Number(config.minAmount))
                    matches = false;
            }
            if (config.maxAmount && context.amount !== undefined) {
                if (context.amount > Number(config.maxAmount))
                    matches = false;
            }
            if (config.minDays && context.days !== undefined) {
                if (context.days < config.minDays)
                    matches = false;
            }
            if (config.maxDays && context.days !== undefined) {
                if (context.days > config.maxDays)
                    matches = false;
            }
            if (matches) {
                return config.chain;
            }
        }
        return this.getDefaultChain(context.requestType);
    }
    getDefaultChain(requestType) {
        const defaults = {
            LEAVE: [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR],
            ADVANCE: [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE],
            RAISE: [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE, client_1.ApprovalStep.CEO],
            PAYROLL: [client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE, client_1.ApprovalStep.CEO],
            WPS: [client_1.ApprovalStep.HR, client_1.ApprovalStep.FINANCE, client_1.ApprovalStep.CEO],
        };
        return defaults[requestType] || [client_1.ApprovalStep.MANAGER, client_1.ApprovalStep.HR];
    }
    getNextStep(chain, currentStep) {
        const currentIndex = chain.indexOf(currentStep);
        if (currentIndex === -1 || currentIndex === chain.length - 1) {
            return client_1.ApprovalStep.COMPLETED;
        }
        return chain[currentIndex + 1];
    }
    getFirstStep(chain) {
        return chain[0] || client_1.ApprovalStep.MANAGER;
    }
    isChainComplete(chain, currentStep) {
        return currentStep === client_1.ApprovalStep.COMPLETED;
    }
    validateTransition(chain, fromStep, toStep) {
        const fromIndex = chain.indexOf(fromStep);
        const toIndex = chain.indexOf(toStep);
        if (toStep === client_1.ApprovalStep.COMPLETED)
            return;
        if (toIndex !== fromIndex + 1) {
            throw new common_1.BadRequestException(`لا يمكن التحويل من ${fromStep} إلى ${toStep}`);
        }
    }
    getStepNameAr(step) {
        const names = {
            MANAGER: 'المدير المباشر',
            HR: 'الموارد البشرية',
            FINANCE: 'المدير المالي',
            CEO: 'المدير العام',
            COMPLETED: 'مكتمل',
        };
        return names[step] || step;
    }
    getPermissionForStep(requestType, step) {
        return `${requestType}_APPROVE_${step}`;
    }
    async createDefaultConfigs(companyId) {
        const defaultConfigs = [
            {
                requestType: client_1.ApprovalRequestType.ADVANCE,
                name: 'سلف صغيرة',
                description: 'سلف أقل من 5000 ريال',
                maxAmount: new library_1.Decimal(5000),
                chain: ['MANAGER', 'HR'],
                priority: 10,
            },
            {
                requestType: client_1.ApprovalRequestType.ADVANCE,
                name: 'سلف متوسطة',
                description: 'سلف من 5000 إلى 20000 ريال',
                minAmount: new library_1.Decimal(5000),
                maxAmount: new library_1.Decimal(20000),
                chain: ['MANAGER', 'HR', 'FINANCE'],
                priority: 20,
            },
            {
                requestType: client_1.ApprovalRequestType.ADVANCE,
                name: 'سلف كبيرة',
                description: 'سلف أكثر من 20000 ريال',
                minAmount: new library_1.Decimal(20000),
                chain: ['MANAGER', 'HR', 'FINANCE', 'CEO'],
                priority: 30,
            },
            {
                requestType: client_1.ApprovalRequestType.RAISE,
                name: 'زيادات الرواتب',
                description: 'جميع طلبات الزيادة',
                chain: ['MANAGER', 'HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
            {
                requestType: client_1.ApprovalRequestType.LEAVE,
                name: 'إجازة عادية',
                description: 'إجازة 14 يوم أو أقل',
                maxDays: 14,
                chain: ['MANAGER', 'HR'],
                priority: 10,
            },
            {
                requestType: client_1.ApprovalRequestType.LEAVE,
                name: 'إجازة طويلة',
                description: 'إجازة أكثر من 14 يوم',
                minDays: 15,
                chain: ['MANAGER', 'HR', 'CEO'],
                priority: 20,
            },
            {
                requestType: client_1.ApprovalRequestType.WPS,
                name: 'تصدير WPS',
                description: 'موافقات تصدير ملفات WPS',
                chain: ['HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
            {
                requestType: client_1.ApprovalRequestType.PAYROLL,
                name: 'دورة الرواتب',
                description: 'موافقات دورة الرواتب',
                chain: ['HR', 'FINANCE', 'CEO'],
                priority: 10,
            },
        ];
        for (const config of defaultConfigs) {
            await this.prisma.approvalChainConfig.create({
                data: {
                    companyId,
                    ...config,
                },
            });
        }
    }
};
exports.ApprovalWorkflowService = ApprovalWorkflowService;
exports.ApprovalWorkflowService = ApprovalWorkflowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApprovalWorkflowService);
//# sourceMappingURL=approval-workflow.service.js.map