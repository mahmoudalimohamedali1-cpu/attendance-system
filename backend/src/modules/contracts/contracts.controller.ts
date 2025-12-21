import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto, UpdateContractDto, TerminateContractDto, RenewContractDto } from './dto/contract.dto';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
    constructor(private contractsService: ContractsService) { }

    @Get()
    @ApiOperation({ summary: 'جلب كل العقود' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.contractsService.findAll(companyId);
    }

    @Get('expiring')
    @ApiOperation({ summary: 'جلب العقود المنتهية قريباً' })
    getExpiring(@CurrentUser('companyId') companyId: string) {
        return this.contractsService.getExpiring(companyId);
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
    ) {
        return this.contractsService.create(dto, companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'تحديث عقد' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateContractDto,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.contractsService.update(id, dto, companyId);
    }

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
    ) {
        return this.contractsService.renew(id, dto, companyId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف عقد' })
    delete(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string,
    ) {
        return this.contractsService.delete(id, companyId);
    }
}
