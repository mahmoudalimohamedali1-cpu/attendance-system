import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ImportUsersDto } from './dto/import-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, phone, password, ...rest } = createUserDto;

    // Check if user exists
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

    // Generate employee code
    const employeeCode = await this.generateEmployeeCode();

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        employeeCode,
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

  async findAll(query: UserQueryDto) {
    const {
      search,
      role,
      status,
      branchId,
      departmentId,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {};

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
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          faceData: { select: { faceImage: true, registeredAt: true } },
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branch: true,
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        employees: { select: { id: true, firstName: true, lastName: true, email: true } },
        faceData: true, // إضافة faceData لعرض الصورة
      },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

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

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

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

  async resetFace(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

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

  async importUsers(importUsersDto: ImportUsersDto) {
    const { users } = importUsersDto;
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const userData of users) {
      try {
        await this.create(userData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${userData.email}: ${error.message}`);
      }
    }

    return results;
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  async updateProfile(userId: string, updateData: Partial<UpdateUserDto>) {
    // Only allow certain fields to be updated by user
    const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
    const filteredData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field as keyof UpdateUserDto] !== undefined) {
        filteredData[field] = updateData[field as keyof UpdateUserDto];
      }
    }

    return this.update(userId, filteredData);
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

  async getEmployeesByManager(managerId: string) {
    return this.prisma.user.findMany({
      where: { managerId },
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

  private async generateEmployeeCode(): Promise<string> {
    const lastUser = await this.prisma.user.findFirst({
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

