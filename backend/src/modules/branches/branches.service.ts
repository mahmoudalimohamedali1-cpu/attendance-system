import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  // ============ Branch Methods ============

  async createBranch(createBranchDto: CreateBranchDto) {
    const branch = await this.prisma.branch.create({
      data: createBranchDto,
    });

    // Create default work schedules for the branch
    await this.createDefaultSchedules(branch.id, createBranchDto.workingDays);

    return branch;
  }

  async findAllBranches() {
    return this.prisma.branch.findMany({
      include: {
        departments: true,
        _count: {
          select: { users: true, departments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        departments: true,
        schedules: true,
        _count: {
          select: { users: true, departments: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return branch;
  }

  async updateBranch(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  async deleteBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    if (branch._count.users > 0) {
      throw new ConflictException('لا يمكن حذف فرع يحتوي على موظفين');
    }

    // Delete schedules first
    await this.prisma.workSchedule.deleteMany({ where: { branchId: id } });
    await this.prisma.department.deleteMany({ where: { branchId: id } });
    await this.prisma.branch.delete({ where: { id } });

    return { message: 'تم حذف الفرع بنجاح' };
  }

  async toggleBranchStatus(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return this.prisma.branch.update({
      where: { id },
      data: { isActive: !branch.isActive },
    });
  }

  // ============ Department Methods ============

  async createDepartment(createDepartmentDto: CreateDepartmentDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: createDepartmentDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return this.prisma.department.create({
      data: createDepartmentDto,
    });
  }

  async findAllDepartments(branchId?: string) {
    const where = branchId ? { branchId } : {};

    return this.prisma.department.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateDepartment(id: string, updateData: Partial<CreateDepartmentDto>) {
    const department = await this.prisma.department.findUnique({ where: { id } });

    if (!department) {
      throw new NotFoundException('القسم غير موجود');
    }

    return this.prisma.department.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!department) {
      throw new NotFoundException('القسم غير موجود');
    }

    if (department._count.users > 0) {
      throw new ConflictException('لا يمكن حذف قسم يحتوي على موظفين');
    }

    await this.prisma.department.delete({ where: { id } });
    return { message: 'تم حذف القسم بنجاح' };
  }

  // ============ Schedule Methods ============

  async updateBranchSchedule(branchId: string, schedules: any[]) {
    // Delete existing schedules
    await this.prisma.workSchedule.deleteMany({ where: { branchId } });

    // Create new schedules
    await this.prisma.workSchedule.createMany({
      data: schedules.map((s) => ({
        branchId,
        dayOfWeek: s.dayOfWeek,
        workStartTime: s.workStartTime,
        workEndTime: s.workEndTime,
        isWorkingDay: s.isWorkingDay ?? true,
      })),
    });

    return this.prisma.workSchedule.findMany({ where: { branchId } });
  }

  async getBranchSchedule(branchId: string) {
    return this.prisma.workSchedule.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // ============ Helper Methods ============

  private async createDefaultSchedules(branchId: string, workingDaysStr?: string) {
    const workingDays = workingDaysStr 
      ? workingDaysStr.split(',').map(Number) 
      : [0, 1, 2, 3, 4]; // Sunday to Thursday (default for middle east)

    const schedules = [];
    for (let day = 0; day <= 6; day++) {
      schedules.push({
        branchId,
        dayOfWeek: day,
        workStartTime: '09:00',
        workEndTime: '17:00',
        isWorkingDay: workingDays.includes(day),
      });
    }

    await this.prisma.workSchedule.createMany({ data: schedules });
  }
}

