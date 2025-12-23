import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import {
    CreateContractDto,
    UpdateContractDto,
    TerminateContractDto,
    RenewContractDto,
    SignContractDto,
    RejectContractDto,
    UpdateQiwaStatusDto
} from './dto/contract.dto';

@ApiTags('Contracts - العقود')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
    constructor(private contractsService: ContractsService) { }

    @Get()
    @ApiOperation({ summary: 'جلب كل العقود' })
    @ApiQuery({ name: 'status', required: false, description: 'فلترة حسب الحالة' })
    @ApiQuery({ name: 'qiwaStatus', required: false, description: 'فلترة حسب حالة قوى' })
    findAll(
        @CurrentUser('companyId') companyId: string,
        @Query('status') status?: string,
        @Query('qiwaStatus') qiwaStatus?: string,
    ) {
        return this.contractsService.findAll(companyId, { status, qiwaStatus });
    }

    @Get('stats')
    @ApiOperation({ summary: 'إحصائيات العقود' })
    getStats(@CurrentUser('companyId') companyId: string) {
        return this.contractsService.getStats(companyId);
    }

    @Get('expiring')
    @ApiOperation({ summary: 'جلب العقود المنتهية قريباً' })
    @ApiQuery({ name: 'days', required: false, description: 'عدد الأيام (افتراضي 30)' })
    getExpiring(
        @CurrentUser('companyId') companyId: string,
        @Query('days') days?: string,
    ) {
        return this.contractsService.getExpiring(companyId, days ? parseInt(days) : 30);
    }

    @Get('pending-employer')
    @ApiOperation({ summary: 'العقود بانتظار توقيع صاحب العمل' })
    getPendingForEmployer(@CurrentUser('companyId') companyId: string) {
        return this.contractsService.getPendingForEmployer(companyId);
    }

    @Get('pending-employee')
    @ApiOperation({ summary: 'العقود بانتظار توقيعي (كموظف)' })
    getPendingForEmployee(
        @CurrentUser('id') employeeId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.contractsService.getPendingForEmployee(employeeId, companyId);
    }

    @Get('employee/:userId')
    @ApiOperation({ summary: 'جلب عقود موظف معين' })
    findByEmployee(
        @Param('userId') userId: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.contractsService.findByEmployee(userId, companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'جلب عقد معين' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.contractsService.findOne(id, companyId);
    }

    @Post()
    @ApiOperation({ summary: 'إنشاء عقد جديد' })
    create(
        @Body() dto: CreateContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.create(dto, companyId, userId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'تحديث عقد' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.update(id, dto, companyId, userId);
    }

    // ===== سير عمل التوقيع =====

    @Post(':id/send-to-employee')
    @ApiOperation({ summary: 'إرسال العقد للموظف للتوقيع' })
    sendToEmployee(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.sendToEmployee(id, companyId, userId);
    }

    @Post(':id/employee-sign')
    @ApiOperation({ summary: 'توقيع الموظف على العقد' })
    employeeSign(
        @Param('id') id: string,
        @Body() dto: SignContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') employeeId: string,
    ) {
        return this.contractsService.employeeSign(id, companyId, employeeId, dto);
    }

    @Post(':id/employee-reject')
    @ApiOperation({ summary: 'رفض الموظف للعقد' })
    employeeReject(
        @Param('id') id: string,
        @Body() dto: RejectContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') employeeId: string,
    ) {
        return this.contractsService.employeeReject(id, companyId, employeeId, dto);
    }

    @Post(':id/employer-sign')
    @ApiOperation({ summary: 'توقيع صاحب العمل على العقد' })
    employerSign(
        @Param('id') id: string,
        @Body() dto: SignContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.employerSign(id, companyId, userId, dto);
    }

    // ===== تكامل قوى =====

    @Patch(':id/qiwa-status')
    @ApiOperation({ summary: 'تحديث حالة العقد في قوى' })
    updateQiwaStatus(
        @Param('id') id: string,
        @Body() dto: UpdateQiwaStatusDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.updateQiwaStatus(id, companyId, dto, userId);
    }

    // ===== إدارة العقد =====

    @Post(':id/terminate')
    @ApiOperation({ summary: 'إنهاء عقد' })
    terminate(
        @Param('id') id: string,
        @Body() dto: TerminateContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.terminate(id, dto, companyId, userId);
    }

    @Post(':id/renew')
    @ApiOperation({ summary: 'تجديد عقد' })
    renew(
        @Param('id') id: string,
        @Body() dto: RenewContractDto,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.renew(id, dto, companyId, userId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف عقد (مسودة فقط)' })
    delete(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.contractsService.delete(id, companyId, userId);
    }
}
