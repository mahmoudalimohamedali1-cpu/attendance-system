import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGosiConfigDto } from './dto/create-gosi-config.dto';

@Injectable()
export class GosiService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateGosiConfigDto, companyId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Deactivate other configs if this one is active
            if (dto.isActive !== false) {
                await tx.gosiConfig.updateMany({
                    where: { isActive: true, companyId },
                    data: { isActive: false }
                });
            }
            return tx.gosiConfig.create({
                data: {
                    ...dto,
                    companyId,
                }
            });
        });
    }

    async getActiveConfig(companyId: string) {
        const config = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true, companyId },
            orderBy: { createdAt: 'desc' }
        });
        return config;
    }

    async findAll(companyId: string) {
        return this.prisma.gosiConfig.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, dto: Partial<CreateGosiConfigDto>, companyId: string, userId?: string) {
        // Verify the config belongs to the company
        const existing = await this.prisma.gosiConfig.findFirst({
            where: { id, companyId }
        });
        if (!existing) throw new NotFoundException('الإعداد غير موجود');

        // If activating this config, deactivate others
        if (dto.isActive === true) {
            await this.prisma.gosiConfig.updateMany({
                where: { isActive: true, companyId, id: { not: id } },
                data: { isActive: false }
            });
        }

        const updated = await this.prisma.gosiConfig.update({
            where: { id },
            data: dto
        });

        // ✅ تسجيل تغييرات GOSI للتدقيق
        console.log(`[GOSI AUDIT] Config ${id} updated by ${userId || 'SYSTEM'}:`, {
            previousRates: {
                employeeRate: existing.employeeRate,
                employerRate: existing.employerRate,
                maxCapAmount: existing.maxCapAmount,
            },
            newRates: {
                employeeRate: dto.employeeRate ?? existing.employeeRate,
                employerRate: dto.employerRate ?? existing.employerRate,
                maxCapAmount: dto.maxCapAmount ?? existing.maxCapAmount,
            },
            timestamp: new Date().toISOString(),
        });

        return updated;
    }
}

