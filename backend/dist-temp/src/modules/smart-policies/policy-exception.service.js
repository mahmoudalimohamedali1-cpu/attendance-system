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
var PolicyExceptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyExceptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyExceptionService = PolicyExceptionService_1 = class PolicyExceptionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyExceptionService_1.name);
    }
    async create(companyId, dto, createdBy, createdByName) {
        const policy = await this.prisma.smartPolicy.findFirst({
            where: { id: dto.policyId, companyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException('السياسة غير موجودة');
        }
        await this.validateTarget(dto.exceptionType, dto.targetId, companyId);
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: {
                policyId_exceptionType_targetId: {
                    policyId: dto.policyId,
                    exceptionType: dto.exceptionType,
                    targetId: dto.targetId,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('يوجد استثناء مسجل بالفعل لهذا الهدف');
        }
        const exception = await this.prisma.smartPolicyException.create({
            data: {
                policyId: dto.policyId,
                companyId,
                exceptionType: dto.exceptionType,
                targetId: dto.targetId,
                targetName: dto.targetName,
                reason: dto.reason,
                exceptionFrom: dto.exceptionFrom,
                exceptionTo: dto.exceptionTo,
                createdBy,
                createdByName,
            },
        });
        this.logger.log(`Exception created: ${exception.id} for policy ${dto.policyId}`);
        return exception;
    }
    async update(exceptionId, dto) {
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: { id: exceptionId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('الاستثناء غير موجود');
        }
        return this.prisma.smartPolicyException.update({
            where: { id: exceptionId },
            data: dto,
        });
    }
    async delete(exceptionId) {
        const existing = await this.prisma.smartPolicyException.findUnique({
            where: { id: exceptionId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('الاستثناء غير موجود');
        }
        await this.prisma.smartPolicyException.delete({
            where: { id: exceptionId },
        });
        this.logger.log(`Exception deleted: ${exceptionId}`);
        return { success: true };
    }
    async findByPolicy(policyId) {
        return this.prisma.smartPolicyException.findMany({
            where: { policyId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByCompany(companyId, options) {
        return this.prisma.smartPolicyException.findMany({
            where: {
                companyId,
                ...(options?.isActive !== undefined && { isActive: options.isActive }),
            },
            include: {
                policy: {
                    select: { id: true, name: true, originalText: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async isEmployeeExcluded(policyId, employeeId, employeeData) {
        const now = new Date();
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: {
                policyId,
                isActive: true,
                OR: [
                    { exceptionFrom: null },
                    { exceptionFrom: { lte: now } },
                ],
            },
        });
        const activeExceptions = exceptions.filter(ex => {
            if (!ex.exceptionTo)
                return true;
            return ex.exceptionTo >= now;
        });
        for (const exception of activeExceptions) {
            let isMatch = false;
            switch (exception.exceptionType) {
                case 'EMPLOYEE':
                    isMatch = exception.targetId === employeeId;
                    break;
                case 'DEPARTMENT':
                    isMatch = employeeData?.departmentId === exception.targetId;
                    break;
                case 'BRANCH':
                    isMatch = employeeData?.branchId === exception.targetId;
                    break;
                case 'JOB_TITLE':
                    isMatch = employeeData?.jobTitleId === exception.targetId;
                    break;
            }
            if (isMatch) {
                return {
                    isExcluded: true,
                    exclusionReason: exception.reason || `مستثنى بسبب ${exception.exceptionType}: ${exception.targetName}`,
                    exceptionId: exception.id,
                    exceptionType: exception.exceptionType,
                };
            }
        }
        return { isExcluded: false };
    }
    async getExcludedEmployees(policyId) {
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: {
                policyId,
                isActive: true,
                exceptionType: 'EMPLOYEE',
            },
            select: { targetId: true },
        });
        return exceptions.map(ex => ex.targetId);
    }
    async toggleActive(exceptionId, isActive) {
        return this.prisma.smartPolicyException.update({
            where: { id: exceptionId },
            data: { isActive },
        });
    }
    async copyExceptions(sourcePolicyId, targetPolicyId, copiedBy, copiedByName) {
        const sourceExceptions = await this.findByPolicy(sourcePolicyId);
        const createdExceptions = [];
        for (const ex of sourceExceptions) {
            try {
                const newException = await this.prisma.smartPolicyException.create({
                    data: {
                        policyId: targetPolicyId,
                        companyId: ex.companyId,
                        exceptionType: ex.exceptionType,
                        targetId: ex.targetId,
                        targetName: ex.targetName,
                        reason: ex.reason ? `(منسوخ) ${ex.reason}` : '(منسوخ من سياسة أخرى)',
                        exceptionFrom: ex.exceptionFrom,
                        exceptionTo: ex.exceptionTo,
                        createdBy: copiedBy,
                        createdByName: copiedByName,
                    },
                });
                createdExceptions.push(newException);
            }
            catch (error) {
                this.logger.warn(`Failed to copy exception ${ex.id}: ${error.message}`);
            }
        }
        return {
            copied: createdExceptions.length,
            total: sourceExceptions.length,
            exceptions: createdExceptions,
        };
    }
    async validateTarget(exceptionType, targetId, companyId) {
        let exists = false;
        switch (exceptionType) {
            case 'EMPLOYEE':
                const employee = await this.prisma.user.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!employee;
                break;
            case 'DEPARTMENT':
                const department = await this.prisma.department.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!department;
                break;
            case 'BRANCH':
                const branch = await this.prisma.branch.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!branch;
                break;
            case 'JOB_TITLE':
                const jobTitle = await this.prisma.jobTitle.findFirst({
                    where: { id: targetId, companyId },
                });
                exists = !!jobTitle;
                break;
            default:
                throw new common_1.BadRequestException(`نوع الاستثناء غير صالح: ${exceptionType}`);
        }
        if (!exists) {
            throw new common_1.NotFoundException(`الهدف غير موجود: ${exceptionType} - ${targetId}`);
        }
    }
    async getExceptionStats(policyId) {
        const exceptions = await this.prisma.smartPolicyException.findMany({
            where: { policyId },
        });
        const stats = {
            total: exceptions.length,
            active: exceptions.filter(e => e.isActive).length,
            inactive: exceptions.filter(e => !e.isActive).length,
            byType: {
                EMPLOYEE: 0,
                DEPARTMENT: 0,
                BRANCH: 0,
                JOB_TITLE: 0,
            },
            permanent: 0,
            temporary: 0,
        };
        for (const ex of exceptions) {
            if (ex.isActive) {
                const exType = ex.exceptionType;
                stats.byType[exType] = (stats.byType[exType] || 0) + 1;
                if (ex.exceptionTo) {
                    stats.temporary++;
                }
                else {
                    stats.permanent++;
                }
            }
        }
        return stats;
    }
};
exports.PolicyExceptionService = PolicyExceptionService;
exports.PolicyExceptionService = PolicyExceptionService = PolicyExceptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyExceptionService);
//# sourceMappingURL=policy-exception.service.js.map