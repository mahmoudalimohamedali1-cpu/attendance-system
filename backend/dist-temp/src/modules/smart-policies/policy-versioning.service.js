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
var PolicyVersioningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyVersioningService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PolicyVersioningService = PolicyVersioningService_1 = class PolicyVersioningService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyVersioningService_1.name);
    }
    async createVersion(policyId, userId, userName, changeReason) {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        if (!policy) {
            throw new common_1.NotFoundException(`السياسة غير موجودة: ${policyId}`);
        }
        const latestVersion = await this.prisma.smartPolicyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
        });
        const newVersion = (latestVersion?.version || 0) + 1;
        const versionRecord = await this.prisma.smartPolicyVersion.create({
            data: {
                policyId,
                version: newVersion,
                originalText: policy.originalText,
                parsedRule: policy.parsedRule,
                conditions: policy.conditions,
                actions: policy.actions,
                changeReason,
                changedBy: userId,
                changedByName: userName,
            },
        });
        await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: { currentVersion: newVersion },
        });
        this.logger.log(`تم إنشاء الإصدار ${newVersion} للسياسة ${policyId}`);
        return versionRecord;
    }
    async getVersionHistory(policyId, options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const skip = (page - 1) * limit;
        const [versions, total] = await Promise.all([
            this.prisma.smartPolicyVersion.findMany({
                where: { policyId },
                orderBy: { version: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.smartPolicyVersion.count({ where: { policyId } }),
        ]);
        return {
            data: versions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getVersion(policyId, version) {
        const versionRecord = await this.prisma.smartPolicyVersion.findUnique({
            where: {
                policyId_version: { policyId, version },
            },
        });
        if (!versionRecord) {
            throw new common_1.NotFoundException(`الإصدار ${version} غير موجود للسياسة ${policyId}`);
        }
        return versionRecord;
    }
    async revertToVersion(policyId, version, userId, userName) {
        const targetVersion = await this.getVersion(policyId, version);
        await this.createVersion(policyId, userId, userName, `استعادة الإصدار ${version}`);
        const updatedPolicy = await this.prisma.smartPolicy.update({
            where: { id: policyId },
            data: {
                originalText: targetVersion.originalText,
                parsedRule: targetVersion.parsedRule,
                conditions: targetVersion.conditions,
                actions: targetVersion.actions,
            },
        });
        this.logger.log(`تم استعادة السياسة ${policyId} للإصدار ${version}`);
        return updatedPolicy;
    }
    async compareVersions(policyId, v1, v2) {
        const [version1, version2] = await Promise.all([
            this.getVersion(policyId, v1),
            this.getVersion(policyId, v2),
        ]);
        return {
            version1: {
                version: v1,
                originalText: version1.originalText,
                conditions: version1.conditions,
                actions: version1.actions,
                changedBy: version1.changedByName,
                createdAt: version1.createdAt,
            },
            version2: {
                version: v2,
                originalText: version2.originalText,
                conditions: version2.conditions,
                actions: version2.actions,
                changedBy: version2.changedByName,
                createdAt: version2.createdAt,
            },
            differences: {
                textChanged: version1.originalText !== version2.originalText,
                conditionsChanged: JSON.stringify(version1.conditions) !== JSON.stringify(version2.conditions),
                actionsChanged: JSON.stringify(version1.actions) !== JSON.stringify(version2.actions),
            },
        };
    }
    async pruneOldVersions(policyId, keepCount = 10) {
        const versions = await this.prisma.smartPolicyVersion.findMany({
            where: { policyId },
            orderBy: { version: 'desc' },
            skip: keepCount,
            select: { id: true },
        });
        if (versions.length > 0) {
            await this.prisma.smartPolicyVersion.deleteMany({
                where: {
                    id: { in: versions.map(v => v.id) },
                },
            });
            this.logger.log(`تم حذف ${versions.length} إصدار قديم للسياسة ${policyId}`);
        }
        return { deleted: versions.length };
    }
};
exports.PolicyVersioningService = PolicyVersioningService;
exports.PolicyVersioningService = PolicyVersioningService = PolicyVersioningService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyVersioningService);
//# sourceMappingURL=policy-versioning.service.js.map