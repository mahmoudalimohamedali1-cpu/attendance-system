import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSalaryComponentDto } from './dto/create-salary-component.dto';
import { UpdateSalaryComponentDto } from './dto/update-salary-component.dto';

@Injectable()
export class SalaryComponentsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateSalaryComponentDto, companyId: string) {
        const existing = await this.prisma.salaryComponent.findFirst({
            where: { code: dto.code, companyId },
        });

        if (existing) {
            throw new ConflictException('كود المكون مسجل مسبقاً في هذه الشركة');
        }

        return this.prisma.salaryComponent.create({
            data: { ...dto, companyId },
        });
    }

    async findAll(companyId: string) {
        return this.prisma.salaryComponent.findMany({
            where: { companyId },
            orderBy: { code: 'asc' },
        });
    }

    async findOne(id: string, companyId: string) {
        const component = await this.prisma.salaryComponent.findFirst({
            where: { id, companyId },
        });

        if (!component) {
            throw new NotFoundException('المكون غير موجود');
        }

        return component;
    }

    async update(id: string, companyId: string, dto: UpdateSalaryComponentDto) {
        await this.findOne(id, companyId);

        if (dto.code) {
            const existing = await this.prisma.salaryComponent.findFirst({
                where: { code: dto.code, companyId, id: { not: id } },
            });
            if (existing) {
                throw new ConflictException('كود المكون مستخدم من قبل مكون آخر في هذه الشركة');
            }
        }

        return this.prisma.salaryComponent.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string, companyId: string) {
        const component = await this.findOne(id, companyId);

        // فحص إذا كان المكون مستخدماً في أي هيكل رواتب
        const used = await this.prisma.salaryStructureLine.findFirst({
            where: { componentId: id, structure: { companyId } }
        });

        if (used) {
            throw new ConflictException('لا يمكن حذف المكون لأنه مستخدم في هياكل رواتب');
        }

        return this.prisma.salaryComponent.delete({
            where: { id },
        });
    }
}
