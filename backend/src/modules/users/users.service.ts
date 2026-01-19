import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { LeaveCalculationService } from '../leaves/leave-calculation.service';
import { SettingsService } from '../settings/settings.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private leaveCalculationService: LeaveCalculationService,
    private settingsService: SettingsService,
    private permissionsService: PermissionsService,
  ) { }

  async create(createUserDto: CreateUserDto, companyId: string) {
    const { email, phone, password, annualLeaveDays, hireDate, ...rest } = createUserDto;

    // Check if user exists within the company or globally if email/phone must be unique across all tenants
    // Usually, emails are unique globally in SaaS, but phone/employeeCode might be per tenant.
    // Given the current schema, let's stick to global unique for email/phone if that's the requirement,
    // otherwise, we'd need to scope the unique index.
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate employee code (scoped to company)
    const employeeCode = await this.generateEmployeeCode(companyId);

    // حساب رصيد الإجازات
    let leaveDays = 21; // القيمة الافتراضية
    let earnedDays = 21;

    // فحص سياسة ترحيل الإجازات
    const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);

    if (hireDate) {
      const hireDateObj = new Date(hireDate);

      if (disableCarryover) {
        // نظام عدم الترحيل: حساب بسيط حسب سنوات الخدمة
        leaveDays = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
        earnedDays = this.leaveCalculationService.calculateRemainingLeaveDaysNoCarryover(hireDateObj, 0);
      } else {
        // نظام الترحيل: حساب تراكمي
        earnedDays = this.leaveCalculationService.calculateRemainingLeaveDays(hireDateObj, 0);
        leaveDays = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
      }
    } else if (annualLeaveDays) {
      // إذا لم يكن هناك تاريخ تعيين، استخدم القيمة المدخلة يدوياً
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

  async findAll(query: UserQueryDto, companyId: string, requesterId?: string, userRole?: string) {
    const {
      search,
      role,
      status,
      branchId,
      departmentId,
      page = 1,
      limit = 20,
    } = query;

    const where: any = { companyId };

    // Get accessible employees based on permissions (for non-ADMIN users)
    if (userRole !== 'ADMIN' && requesterId) {
      const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(requesterId, companyId, 'EMPLOYEES_VIEW');
      if (accessibleEmployeeIds.length === 0) {
        // No permission to view employees
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

    if (role) where.role = role;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (departmentId) where.departmentId = departmentId;

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
          costCenter: { select: { id: true, name_ar: true, code: true } },
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

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

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
      throw new NotFoundException('المستخدم غير موجود');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId }
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Check email/phone uniqueness if changed
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('البريد الإلكتروني مستخدم من قبل مستخدم آخر');
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: { phone: updateUserDto.phone },
      });
      if (existingUser) {
        throw new ConflictException('رقم الهاتف مستخدم من قبل مستخدم آخر');
      }
    }

    // Handle password update
    let updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // تحويل تاريخ التعيين وإعادة حساب الإجازات
    if (updateData.hireDate) {
      const hireDateObj = new Date(updateData.hireDate);
      updateData.hireDate = hireDateObj;

      // فحص سياسة ترحيل الإجازات
      const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);
      const usedDays = user.usedLeaveDays ?? 0;

      if (disableCarryover) {
        // نظام عدم الترحيل: حساب بسيط
        const annualAllowance = this.leaveCalculationService.getCurrentAnnualAllowance(hireDateObj);
        const remainingDays = this.leaveCalculationService.calculateRemainingLeaveDaysNoCarryover(hireDateObj, usedDays);
        updateData.annualLeaveDays = annualAllowance;
        updateData.remainingLeaveDays = remainingDays;
      } else {
        // نظام الترحيل: حساب تراكمي
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

  async remove(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId }
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // Soft delete by changing status
    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: 'تم تعطيل المستخدم بنجاح' };
  }

  async activate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return { message: 'تم تفعيل المستخدم بنجاح' };
  }

  async resetFace(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId }
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // حذف بيانات الوجه
    await this.prisma.faceData.deleteMany({
      where: { userId: id },
    });

    // تحديث حالة تسجيل الوجه
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

  async importUsers(importUsersDto: ImportUsersDto, companyId: string) {
    const { users } = importUsersDto;
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const userData of users) {
      try {
        await this.create(userData, companyId);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${userData.email}: ${error.message}`);
      }
    }

    return results;
  }

  async getProfile(userId: string, companyId: string) {
    return this.findOne(userId, companyId);
  }

  async updateProfile(userId: string, updateData: Partial<UpdateUserDto>, companyId: string) {
    // Only allow certain fields to be updated by user
    const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
    const filteredData: any = {};

    for (const field of allowedFields) {
      if (updateData[field as keyof UpdateUserDto] !== undefined) {
        filteredData[field] = updateData[field as keyof UpdateUserDto];
      }
    }

    return this.update(userId, filteredData, companyId);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }


  async getEmployeesByManager(managerId: string, companyId: string) {
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

  private async generateEmployeeCode(companyId: string): Promise<string> {
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
}

