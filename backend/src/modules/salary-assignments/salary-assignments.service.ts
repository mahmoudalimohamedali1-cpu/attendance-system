import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSalaryAssignmentDto } from './dto/create-salary-assignment.dto';

@Injectable()
export class SalaryAssignmentsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateSalaryAssignmentDto, companyId: string) {
        const employee = await this.prisma.user.findFirst({ where: { id: dto.employeeId, companyId } });
        if (!employee) throw new NotFoundException('الموظف غير موجود');

        const structure = await this.prisma.salaryStructure.findFirst({ where: { id: dto.structureId, companyId } });
        if (!structure) throw new NotFoundException('هيكل الراتب غير موجود');

        return this.prisma.$transaction(async (tx) => {
            if (dto.isActive !== false) {
                await tx.employeeSalaryAssignment.updateMany({
                    where: { employeeId: dto.employeeId, isActive: true },
                    data: { isActive: false, endDate: new Date() },
                });
            }

            return tx.employeeSalaryAssignment.create({
                data: {
                    employeeId: dto.employeeId,
                    structureId: dto.structureId,
                    baseSalary: dto.baseSalary,
                    effectiveDate: new Date(dto.effectiveDate),
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                    isActive: dto.isActive ?? true,
                },
                include: {
                    structure: {
                        include: { lines: { include: { component: true } } }
                    }
                }
            });
        });
    }

    async findAll(companyId: string) {
        return this.prisma.employeeSalaryAssignment.findMany({
            where: { employee: { companyId } },
            include: {
                employee: {
                    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true }
                },
                structure: true,
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }

    async findByEmployee(employeeId: string, companyId: string) {
        return this.prisma.employeeSalaryAssignment.findMany({
            where: { employeeId, employee: { companyId } },
            include: {
                structure: true,
            },
            orderBy: { effectiveDate: 'desc' },
        });
    }

    async findActive(employeeId: string, companyId: string) {
        return this.prisma.employeeSalaryAssignment.findFirst({
            where: { employeeId, isActive: true, employee: { companyId } },
            include: {
                structure: {
                    include: {
                        lines: {
                            include: { component: true },
                            orderBy: { priority: 'asc' },
                        },
                    },
                },
            },
        });
    }

    async remove(id: string, companyId: string) {
        const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { id, employee: { companyId } }
        });

        if (!assignment) throw new NotFoundException('التخصيص غير موجود');

        return this.prisma.employeeSalaryAssignment.delete({
            where: { id },
        });
    }
}
