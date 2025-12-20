import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface CreateJobTitleDto {
    name: string;
    companyId: string;
    nameEn?: string;
    level?: Role;
    isDirectManager?: boolean;
}

export interface UpdateJobTitleDto {
    name?: string;
    companyId?: string;
    nameEn?: string;
    level?: Role;
    isDirectManager?: boolean;
}

@Injectable()
export class JobTitlesService {
    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء درجة وظيفية جديدة
     */
    async create(dto: CreateJobTitleDto) {
        // التحقق من عدم تكرار الاسم في نفس الشركة
        const existing = await this.prisma.jobTitle.findFirst({
            where: {
                companyId: dto.companyId,
                name: dto.name,
            },
        });

        if (existing) {
            throw new ConflictException('هذه الدرجة الوظيفية موجودة بالفعل في هذه الشركة');
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

    /**
     * الحصول على كل الدرجات الوظيفية
     */
    async findAll(companyId: string) {
        return this.prisma.jobTitle.findMany({
            where: { companyId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });
    }

    /**
     * الحصول على الدرجات الوظيفية التي يمكن أن تكون مديرين مباشرين
     */
    async findDirectManagers(companyId: string) {
        return this.prisma.jobTitle.findMany({
            where: { companyId, isDirectManager: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * الحصول على المستخدمين الذين لديهم درجة وظيفية مدير مباشر
     */
    async findDirectManagerUsers(companyId: string) {
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

    /**
     * الحصول على درجة وظيفية بالـ ID
     */
    async findOne(id: string) {
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
            throw new NotFoundException('الدرجة الوظيفية غير موجودة');
        }

        return jobTitle;
    }

    /**
     * تحديث درجة وظيفية
     */
    async update(id: string, dto: UpdateJobTitleDto) {
        // التحقق من وجود الدرجة
        await this.findOne(id);

        // التحقق من عدم تكرار الاسم في نفس الشركة
        if (dto.name) {
            const existing = await this.prisma.jobTitle.findFirst({
                where: {
                    companyId: dto.companyId,
                    name: dto.name,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException('هذا الاسم مستخدم بالفعل في هذه الشركة');
            }
        }

        return this.prisma.jobTitle.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * حذف درجة وظيفية
     */
    async remove(id: string) {
        // التحقق من وجود الدرجة
        const jobTitle = await this.findOne(id);

        // التحقق من عدم وجود موظفين مربوطين
        const usersCount = await this.prisma.user.count({
            where: { jobTitleId: id },
        });

        if (usersCount > 0) {
            throw new ConflictException(
                `لا يمكن حذف هذه الدرجة الوظيفية لأنها مربوطة بـ ${usersCount} موظف`,
            );
        }

        await this.prisma.jobTitle.delete({ where: { id } });

        return { message: 'تم حذف الدرجة الوظيفية بنجاح' };
    }

    // ==================== إدارة صلاحيات الدرجة الوظيفية ====================

    /**
     * الحصول على صلاحيات درجة وظيفية
     */
    async getJobTitlePermissions(jobTitleId: string) {
        await this.findOne(jobTitleId); // التحقق من وجود الدرجة

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

    /**
     * إضافة صلاحية لدرجة وظيفية
     */
    async addJobTitlePermission(jobTitleId: string, permissionId: string, scope: string = 'TEAM') {
        await this.findOne(jobTitleId); // التحقق من وجود الدرجة

        // التحقق من وجود الصلاحية
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });
        if (!permission) {
            throw new NotFoundException('الصلاحية غير موجودة');
        }

        // التحقق من عدم التكرار
        const existing = await this.prisma.jobTitlePermission.findUnique({
            where: {
                jobTitleId_permissionId: { jobTitleId, permissionId },
            },
        });
        if (existing) {
            throw new ConflictException('هذه الصلاحية مضافة بالفعل لهذه الدرجة');
        }

        return this.prisma.jobTitlePermission.create({
            data: {
                jobTitleId,
                permissionId,
                scope: scope as any,
            },
            include: {
                permission: true,
            },
        });
    }

    /**
     * حذف صلاحية من درجة وظيفية
     */
    async removeJobTitlePermission(jobTitleId: string, permissionId: string) {
        const existing = await this.prisma.jobTitlePermission.findUnique({
            where: {
                jobTitleId_permissionId: { jobTitleId, permissionId },
            },
        });

        if (!existing) {
            throw new NotFoundException('هذه الصلاحية غير مرتبطة بهذه الدرجة');
        }

        await this.prisma.jobTitlePermission.delete({
            where: { id: existing.id },
        });

        return { message: 'تم حذف الصلاحية بنجاح' };
    }

    /**
     * مزامنة صلاحيات المستخدم مع درجته الوظيفية
     * تُستدعى عند تغيير الدرجة الوظيفية للمستخدم
     */
    async syncUserPermissions(userId: string, newJobTitleId: string | null, oldJobTitleId: string | null) {
        // حذف الصلاحيات القديمة من الدرجة السابقة
        if (oldJobTitleId) {
            const oldPermissions = await this.prisma.jobTitlePermission.findMany({
                where: { jobTitleId: oldJobTitleId },
            });

            for (const perm of oldPermissions) {
                await this.prisma.userPermission.deleteMany({
                    where: {
                        userId,
                        permissionId: perm.permissionId,
                        // فقط الصلاحيات من الدرجة الوظيفية (يمكن تحديدها بالـ scope أو metadata لاحقاً)
                    },
                });
            }
        }

        // إضافة الصلاحيات من الدرجة الجديدة
        if (newJobTitleId) {
            const newPermissions = await this.prisma.jobTitlePermission.findMany({
                where: { jobTitleId: newJobTitleId },
            });

            for (const perm of newPermissions) {
                // التحقق من عدم التكرار
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
}
