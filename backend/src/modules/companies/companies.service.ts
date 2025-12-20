import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateCompanyDto) {
        const existing = await this.prisma.company.findFirst({
            where: {
                OR: [
                    { name: dto.name },
                    dto.crNumber ? { crNumber: dto.crNumber } : undefined,
                    dto.taxId ? { taxId: dto.taxId } : undefined,
                ].filter(Boolean) as any,
            },
        });

        if (existing) {
            throw new ConflictException('شركة بنفس الاسم أو السجل التجاري أو الرقم الضريبي موجودة بالفعل');
        }

        return this.prisma.company.create({
            data: dto,
        });
    }

    async findAll() {
        return this.prisma.company.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });

        if (!company) {
            throw new NotFoundException('الشركة غير موجودة');
        }

        return company;
    }

    async update(id: string, dto: UpdateCompanyDto) {
        await this.findOne(id);

        return this.prisma.company.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // التحقق من وجود بيانات مرتبطة - في نظام الـ multi-tenant قد لا نرغب في حذف الشركات بسهولة
        const userCount = await this.prisma.user.count({ where: { companyId: id } });
        if (userCount > 0) {
            throw new ConflictException('لا يمكن حذف الشركة لوجود مستخدمين مرتبطين بها');
        }

        return this.prisma.company.delete({
            where: { id },
        });
    }
}
