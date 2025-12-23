import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bank-accounts')
export class BankAccountsController {
    constructor(private readonly service: BankAccountsService) { }

    @Get()
    @ApiOperation({ summary: 'جلب كل الحسابات البنكية للموظفين' })
    findAll(@CurrentUser() user: any) {
        return this.service.findAll(user.companyId);
    }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'إضافة حساب بنكي لموظف' })
    create(@Body() dto: CreateBankAccountDto) {
        return this.service.create(dto);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'عرض الحسابات البنكية لموظف معين' })
    findByUser(@Param('userId') userId: string) {
        return this.service.findByUser(userId);
    }

    @Patch(':id/primary')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'تعيين الحساب كحساب رئيسي' })
    setPrimary(@Param('id') id: string) {
        return this.service.setPrimary(id);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'حذف حساب بنكي' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Patch(':id/verify')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'التحقق من الحساب البنكي' })
    verify(@Param('id') id: string, @CurrentUser() user: any) {
        return this.service.verify(id, user.id);
    }

    @Patch(':id/unverify')
    @Roles('ADMIN', 'HR')
    @ApiOperation({ summary: 'إلغاء التحقق من الحساب البنكي' })
    unverify(@Param('id') id: string) {
        return this.service.unverify(id);
    }
}
