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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const leave_calculation_service_1 = require("../leaves/leave-calculation.service");
const settings_service_1 = require("../settings/settings.service");
const permissions_service_1 = require("../permissions/permissions.service");
let UsersService = class UsersService {
    constructor(prisma, leaveCalculationService, settingsService, permissionsService) {
        this.prisma = prisma;
        this.leaveCalculationService = leaveCalculationService;
        this.settingsService = settingsService;
        this.permissionsService = permissionsService;
    }
    async create(createUserDto, companyId) {
        const { email, phone, password, annualLeaveDays, hireDate, ...rest } = createUserDto;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email }, ...(phone ? [{ phone }] : [])],
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const employeeCode = await this.generateEmployeeCode(companyId);
        let leaveDays = 21;
        let earnedDays = 21;
        const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);
        if (hireDate) {
            const hireDateObj = new Date(hireDate);
            if (disableCarryover) {
                leaveDays = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
                earnedDays = this.leaveCalculationService.calculateRemainingLeaveDaysNoCarryover(hireDateObj, 0);
            }
            else {
                earnedDays = this.leaveCalculationService.calculateRemainingLeaveDays(hireDateObj, 0);
                leaveDays = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
            }
        }
        else if (annualLeaveDays) {
            leaveDays = annualLeaveDays;
            earnedDays = annualLeaveDays;
        }
        const user = await this.prisma.user.create({
            data: {
                email,
                phone,
                companyId,
                password: hashedPassword,
                employeeCode: rest.employeeCode || employeeCode,
                hireDate: hireDate ? new Date(hireDate) : undefined,
                annualLeaveDays: leaveDays,
                remainingLeaveDays: earnedDays,
                usedLeaveDays: 0,
                ...rest,
            },
            include: {
                branch: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                manager: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async findAll(query, companyId, requesterId, userRole) {
        const { search, role, status, branchId, departmentId, page = 1, limit = 20, } = query;
        const where = { companyId };
        if (userRole !== 'ADMIN' && requesterId) {
            const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(requesterId, companyId, 'EMPLOYEES_VIEW');
            if (accessibleEmployeeIds.length === 0) {
                return {
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                };
            }
            where.id = { in: accessibleEmployeeIds };
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        if (branchId)
            where.branchId = branchId;
        if (departmentId)
            where.departmentId = departmentId;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    employeeCode: true,
                    jobTitle: true,
                    role: true,
                    status: true,
                    hireDate: true,
                    faceRegistered: true,
                    annualLeaveDays: true,
                    remainingLeaveDays: true,
                    usedLeaveDays: true,
                    branch: { select: { id: true, name: true } },
                    department: { select: { id: true, name: true } },
                    manager: { select: { id: true, firstName: true, lastName: true } },
                    faceData: { select: { faceImage: true, registeredAt: true } },
                    nationality: true,
                    isSaudi: true,
                    costCenter: { select: { id: true, nameAr: true, code: true } },
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id, companyId) {
        const where = { id };
        if (companyId)
            where.companyId = companyId;
        const user = await this.prisma.user.findFirst({
            where,
            include: {
                branch: true,
                department: true,
                manager: { select: { id: true, firstName: true, lastName: true, email: true } },
                employees: { select: { id: true, firstName: true, lastName: true, email: true } },
                faceData: true,
                bankAccounts: true,
                contracts: true,
                costCenter: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async update(id, updateUserDto, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id, companyId }
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: updateUserDto.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('البريد الإلكتروني مستخدم من قبل مستخدم آخر');
            }
        }
        if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
            const existingUser = await this.prisma.user.findFirst({
                where: { phone: updateUserDto.phone },
            });
            if (existingUser) {
                throw new common_1.ConflictException('رقم الهاتف مستخدم من قبل مستخدم آخر');
            }
        }
        let updateData = { ...updateUserDto };
        if (updateUserDto.password) {
            updateData.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        if (updateData.hireDate) {
            const hireDateObj = new Date(updateData.hireDate);
            updateData.hireDate = hireDateObj;
            const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);
            const usedDays = user.usedLeaveDays ?? 0;
            if (disableCarryover) {
                const annualAllowance = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
                const remainingDays = this.leaveCalculationService.calculateRemainingLeaveDaysNoCarryover(hireDateObj, usedDays);
                updateData.annualLeaveDays = annualAllowance;
                updateData.remainingLeaveDays = remainingDays;
            }
            else {
                const remainingDays = this.leaveCalculationService.calculateRemainingLeaveDays(hireDateObj, usedDays);
                const annualAllowance = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
                updateData.annualLeaveDays = annualAllowance;
                updateData.remainingLeaveDays = remainingDays;
            }
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                branch: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
            },
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    async remove(id, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id, companyId }
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        await this.prisma.user.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });
        return { message: 'تم تعطيل المستخدم بنجاح' };
    }
    async activate(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        await this.prisma.user.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });
        return { message: 'تم تفعيل المستخدم بنجاح' };
    }
    async resetFace(id, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id, companyId }
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        await this.prisma.faceData.deleteMany({
            where: { userId: id },
        });
        await this.prisma.user.update({
            where: { id },
            data: { faceRegistered: false },
        });
        return {
            message: 'تم إعادة تعيين الوجه بنجاح. يمكن للموظف تسجيل وجهه من جديد عند الحضور القادم.',
            userId: id,
            faceRegistered: false,
        };
    }
    async importUsers(importUsersDto, companyId) {
        const { users } = importUsersDto;
        const results = { success: 0, failed: 0, errors: [] };
        for (const userData of users) {
            try {
                await this.create(userData, companyId);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(`${userData.email}: ${error.message}`);
            }
        }
        return results;
    }
    async getProfile(userId, companyId) {
        return this.findOne(userId, companyId);
    }
    async updateProfile(userId, updateData, companyId) {
        const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
        const filteredData = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }
        return this.update(userId, filteredData, companyId);
    }
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new common_1.BadRequestException('كلمة المرور الحالية غير صحيحة');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return { message: 'تم تغيير كلمة المرور بنجاح' };
    }
    async getEmployeesByManager(managerId, companyId) {
        return this.prisma.user.findMany({
            where: { managerId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                jobTitle: true,
                avatar: true,
                status: true,
            },
        });
    }
    async generateEmployeeCode(companyId) {
        const lastUser = await this.prisma.user.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            select: { employeeCode: true },
        });
        let nextNumber = 1;
        if (lastUser?.employeeCode) {
            const match = lastUser.employeeCode.match(/EMP(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        return `EMP${nextNumber.toString().padStart(5, '0')}`;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        leave_calculation_service_1.LeaveCalculationService,
        settings_service_1.SettingsService,
        permissions_service_1.PermissionsService])
], UsersService);
//# sourceMappingURL=users.service.js.map