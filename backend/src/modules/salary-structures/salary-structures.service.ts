import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { UpdateSalaryStructureDto } from './dto/update-salary-structure.dto';

@Injectable()
export class SalaryStructuresService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateSalaryStructureDto, companyId: string) {
        const { lines, ...rest } = dto;

        return this.prisma.salaryStructure.create({
            data: {
                ...rest,
                companyId,
                lines: {
                    create: lines.map(line => ({
                        componentId: line.componentId,
                        amount: line.amount,
                        percentage: line.percentage,
                        priority: line.priority,
                    })),
                },
            },
            include: {
                lines: {
                    include: { component: true },
                },
            },
        });
    }

    async findAll(companyId: string) {
        return this.prisma.salaryStructure.findMany({
            where: { companyId, isActive: true },
            include: {
                lines: {
                    include: { component: true },
                    orderBy: { priority: 'asc' },
                },
                _count: { select: { assignments: true, lines: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, companyId: string) {
        const structure = await this.prisma.salaryStructure.findFirst({
            where: { id, companyId },
            include: {
                lines: {
                    include: { component: true },
                    orderBy: { priority: 'asc' },
                },
            },
        });

        if (!structure) {
            throw new NotFoundException('هيكل الراتب غير موجود');
        }

        return structure;
    }

    async update(id: string, companyId: string, dto: UpdateSalaryStructureDto) {
        const { lines, ...rest } = dto;

        await this.findOne(id, companyId);

        return this.prisma.$transaction(async (tx) => {
            // تحديث البيانات الأساسية
            const updated = await tx.salaryStructure.update({
                where: { id },
                data: rest,
            });

            // إذا تم إرسال المكونات، نحذف القديم ونضيف الجديد
            if (lines) {
                await tx.salaryStructureLine.deleteMany({
                    where: { structureId: id },
                });

                await tx.salaryStructureLine.createMany({
                    data: lines.map(line => ({
                        structureId: id,
                        componentId: line.componentId,
                        amount: line.amount,
                        percentage: line.percentage,
                        priority: line.priority || 0,
                    })),
                });
            }

            return tx.salaryStructure.findFirst({
                where: { id, companyId },
                include: {
                    lines: {
                        include: { component: true },
                        orderBy: { priority: 'asc' },
                    },
                },
            });
        });
    }

    async remove(id: string, companyId: string) {
        const structure = await this.findOne(id, companyId);

        // فحص إذا كان الهيكل مرتبط بموظفين
        const assigned = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { structureId: id }
        });

        if (assigned) {
            // Enterprise behavior: Soft delete (Archive) instead of blocking
            return this.prisma.salaryStructure.update({
                where: { id },
                data: { isActive: false }
            });
        }

        return this.prisma.salaryStructure.delete({
            where: { id },
        });
    }
}
