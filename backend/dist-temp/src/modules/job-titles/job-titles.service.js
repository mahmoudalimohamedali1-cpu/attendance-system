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
exports.JobTitlesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let JobTitlesService = class JobTitlesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.jobTitle.findFirst({
            where: {
                companyId: dto.companyId,
                name: dto.name,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('هذه الدرجة الوظيفية موجودة بالفعل في هذه الشركة');
        }
        return this.prisma.jobTitle.create({
            data: {
                name: dto.name,
                companyId: dto.companyId,
                nameEn: dto.nameEn,
                level: dto.level || 'EMPLOYEE',
                isDirectManager: dto.isDirectManager || false,
            },
        });
    }
    async findAll(companyId) {
        return this.prisma.jobTitle.findMany({
            where: { companyId, isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });
    }
    async findDirectManagers(companyId) {
        return this.prisma.jobTitle.findMany({
            where: { companyId, isDirectManager: true },
            orderBy: { name: 'asc' },
        });
    }
    async findDirectManagerUsers(companyId) {
        return this.prisma.user.findMany({
            where: {
                companyId,
                jobTitleRef: {
                    isDirectManager: true,
                },
                status: 'ACTIVE',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                jobTitleRef: {
                    select: {
                        name: true,
                        level: true,
                    },
                },
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        });
    }
    async findOne(id) {
        const jobTitle = await this.prisma.jobTitle.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!jobTitle) {
            throw new common_1.NotFoundException('الدرجة الوظيفية غير موجودة');
        }
        return jobTitle;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name) {
            const existing = await this.prisma.jobTitle.findFirst({
                where: {
                    companyId: dto.companyId,
                    name: dto.name,
                    id: { not: id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('هذا الاسم مستخدم بالفعل في هذه الشركة');
            }
        }
        return this.prisma.jobTitle.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        const jobTitle = await this.findOne(id);
        const usersCount = await this.prisma.user.count({
            where: { jobTitleId: id },
        });
        if (usersCount > 0) {
            await this.prisma.jobTitle.update({
                where: { id },
                data: { isActive: false }
            });
            return { message: `تم أرشفة الدرجة الوظيفية (مرتبطة بـ ${usersCount} موظف)` };
        }
        await this.prisma.jobTitle.delete({ where: { id } });
        return { message: 'تم حذف الدرجة الوظيفية بنجاح' };
    }
    async getJobTitlePermissions(jobTitleId) {
        await this.findOne(jobTitleId);
        return this.prisma.jobTitlePermission.findMany({
            where: { jobTitleId },
            include: {
                permission: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        nameEn: true,
                        category: true,
                    },
                },
            },
        });
    }
    async addJobTitlePermission(jobTitleId, permissionId, scope = 'TEAM') {
        await this.findOne(jobTitleId);
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });
        if (!permission) {
            throw new common_1.NotFoundException('الصلاحية غير موجودة');
        }
        const existing = await this.prisma.jobTitlePermission.findUnique({
            where: {
                jobTitleId_permissionId: { jobTitleId, permissionId },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('هذه الصلاحية مضافة بالفعل لهذه الدرجة');
        }
        return this.prisma.jobTitlePermission.create({
            data: {
                jobTitleId,
                permissionId,
                scope: scope,
            },
            include: {
                permission: true,
            },
        });
    }
    async removeJobTitlePermission(jobTitleId, permissionId) {
        const existing = await this.prisma.jobTitlePermission.findUnique({
            where: {
                jobTitleId_permissionId: { jobTitleId, permissionId },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('هذه الصلاحية غير مرتبطة بهذه الدرجة');
        }
        await this.prisma.jobTitlePermission.delete({
            where: { id: existing.id },
        });
        return { message: 'تم حذف الصلاحية بنجاح' };
    }
    async syncUserPermissions(userId, newJobTitleId, oldJobTitleId) {
        if (oldJobTitleId) {
            const oldPermissions = await this.prisma.jobTitlePermission.findMany({
                where: { jobTitleId: oldJobTitleId },
            });
            for (const perm of oldPermissions) {
                await this.prisma.userPermission.deleteMany({
                    where: {
                        userId,
                        permissionId: perm.permissionId,
                    },
                });
            }
        }
        if (newJobTitleId) {
            const newPermissions = await this.prisma.jobTitlePermission.findMany({
                where: { jobTitleId: newJobTitleId },
            });
            for (const perm of newPermissions) {
                const existing = await this.prisma.userPermission.findFirst({
                    where: {
                        userId,
                        permissionId: perm.permissionId,
                    },
                });
                if (!existing) {
                    await this.prisma.userPermission.create({
                        data: {
                            userId,
                            permissionId: perm.permissionId,
                            scope: perm.scope,
                        },
                    });
                }
            }
        }
        return { message: 'تم مزامنة الصلاحيات بنجاح' };
    }
};
exports.JobTitlesService = JobTitlesService;
exports.JobTitlesService = JobTitlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobTitlesService);
//# sourceMappingURL=job-titles.service.js.map