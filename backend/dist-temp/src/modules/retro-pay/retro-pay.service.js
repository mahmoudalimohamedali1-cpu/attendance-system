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
exports.RetroPayService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RetroPayService = class RetroPayService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, createdById) {
        const employee = await this.prisma.user.findUnique({ where: { id: dto.employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
        const effectiveFrom = new Date(dto.effectiveFrom);
        const effectiveTo = new Date(dto.effectiveTo);
        if (effectiveFrom > effectiveTo) {
            throw new common_1.BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        }
        const monthsCount = this.calculateMonthsDifference(effectiveFrom, effectiveTo);
        const difference = dto.newAmount - dto.oldAmount;
        const totalAmount = difference * monthsCount;
        return this.prisma.retroPay.create({
            data: {
                employeeId: dto.employeeId,
                reason: dto.reason,
                effectiveFrom,
                effectiveTo,
                oldAmount: dto.oldAmount,
                newAmount: dto.newAmount,
                difference,
                monthsCount,
                totalAmount,
                notes: dto.notes,
                createdById,
                status: 'PENDING',
            },
            include: { employee: true },
        });
    }
    calculateMonthsDifference(from, to) {
        const yearDiff = to.getFullYear() - from.getFullYear();
        const monthDiff = to.getMonth() - from.getMonth();
        return yearDiff * 12 + monthDiff + 1;
    }
    async findAll() {
        return this.prisma.retroPay.findMany({
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByEmployee(employeeId) {
        return this.prisma.retroPay.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(id, approvedById) {
        const retroPay = await this.prisma.retroPay.findUnique({ where: { id } });
        if (!retroPay)
            throw new common_1.NotFoundException('طلب الفرق غير موجود');
        if (retroPay.status !== 'PENDING')
            throw new common_1.BadRequestException('لا يمكن اعتماد طلب غير منتظر');
        return this.prisma.retroPay.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById,
                approvedAt: new Date(),
            },
            include: { employee: true },
        });
    }
    async markAsPaid(id) {
        const retroPay = await this.prisma.retroPay.findUnique({ where: { id } });
        if (!retroPay)
            throw new common_1.NotFoundException('طلب الفرق غير موجود');
        if (retroPay.status !== 'APPROVED')
            throw new common_1.BadRequestException('يجب اعتماد الطلب أولاً');
        return this.prisma.retroPay.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
            },
            include: { employee: true },
        });
    }
    async cancel(id) {
        return this.prisma.retroPay.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: { employee: true },
        });
    }
    async getStats() {
        const [pending, approved, totalPaid] = await Promise.all([
            this.prisma.retroPay.count({ where: { status: 'PENDING' } }),
            this.prisma.retroPay.count({ where: { status: 'APPROVED' } }),
            this.prisma.retroPay.aggregate({
                where: { status: 'PAID' },
                _sum: { totalAmount: true },
            }),
        ]);
        return {
            pendingCount: pending,
            approvedCount: approved,
            totalPaidAmount: totalPaid._sum.totalAmount || 0,
        };
    }
};
exports.RetroPayService = RetroPayService;
exports.RetroPayService = RetroPayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RetroPayService);
//# sourceMappingURL=retro-pay.service.js.map