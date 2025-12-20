import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGosiConfigDto } from './dto/create-gosi-config.dto';

@Injectable()
export class GosiService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateGosiConfigDto) {
        return this.prisma.$transaction(async (tx) => {
            // Deactivate other configs if this one is active
            if (dto.isActive !== false) {
                await tx.gosiConfig.updateMany({
                    where: { isActive: true },
                    data: { isActive: false }
                });
            }
            return tx.gosiConfig.create({ data: dto });
        });
    }

    async getActiveConfig() {
        const config = await this.prisma.gosiConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        return config;
    }

    async findAll() {
        return this.prisma.gosiConfig.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, dto: Partial<CreateGosiConfigDto>) {
        return this.prisma.gosiConfig.update({
            where: { id },
            data: dto
        });
    }
}
