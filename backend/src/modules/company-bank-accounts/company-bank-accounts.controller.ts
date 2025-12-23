import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import { CreateCompanyBankAccountDto, UpdateCompanyBankAccountDto } from './dto/company-bank-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Company Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company-bank-accounts')
export class CompanyBankAccountsController {
    constructor(private readonly service: CompanyBankAccountsService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة حساب بنكي جديد للشركة' })
    create(
        @Body() dto: CreateCompanyBankAccountDto,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.create(companyId, dto);
    }

    @Get()
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب كل الحسابات البنكية للشركة' })
    findAll(@CurrentUser('companyId') companyId: string) {
        return this.service.findAll(companyId);
    }

    @Get('active')
    @ApiOperation({ summary: 'جلب الحسابات البنكية النشطة' })
    findActive(@CurrentUser('companyId') companyId: string) {
        return this.service.findActive(companyId);
    }

    @Get('primary')
    @ApiOperation({ summary: 'جلب الحساب البنكي الرئيسي' })
    findPrimary(@CurrentUser('companyId') companyId: string) {
        return this.service.findPrimary(companyId);
    }

    @Get('banks')
    @ApiOperation({ summary: 'قائمة البنوك السعودية المعتمدة' })
    getSaudiBanks() {
        return this.service.getSaudiBanks();
    }

    @Get(':id')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'جلب تفاصيل حساب بنكي' })
    findOne(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.findOne(id, companyId);
    }

    @Put(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تحديث حساب بنكي' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateCompanyBankAccountDto,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.update(id, companyId, dto);
    }

    @Patch(':id/primary')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تعيين حساب كحساب رئيسي' })
    setPrimary(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.setPrimary(id, companyId);
    }

    @Patch(':id/toggle-active')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تفعيل/تعطيل حساب بنكي' })
    toggleActive(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.toggleActive(id, companyId);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف حساب بنكي' })
    remove(
        @Param('id') id: string,
        @CurrentUser('companyId') companyId: string
    ) {
        return this.service.remove(id, companyId);
    }
}
