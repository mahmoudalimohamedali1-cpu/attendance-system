import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MuqeemService } from './muqeem.service';
import { MuqeemTransactionType } from './interfaces/muqeem.interface';

@ApiTags('مقيم - Muqeem')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('integrations/muqeem')
export class MuqeemController {
    constructor(private readonly muqeemService: MuqeemService) { }

    @Get('transactions')
    @RequirePermission('MUQEEM_VIEW')
    @ApiOperation({ summary: 'جلب سجل عمليات مقيم' })
    getTransactions(
        @CurrentUser('companyId') companyId: string,
        @Query() query: any,
    ) {
        return this.muqeemService.getTransactions(companyId, query);
    }

    @Post('transaction/execute')
    @RequirePermission('MUQEEM_EXECUTE')
    @ApiOperation({ summary: 'تنفيذ عملية في مقيم (إصدار، تجديد، إلخ)' })
    executeTransaction(
        @CurrentUser('companyId') companyId: string,
        @CurrentUser('id') currentUserId: string,
        @Body() body: { userId: string; type: MuqeemTransactionType; payload: any },
    ) {
        return this.muqeemService.executeTransaction(
            companyId,
            body.userId,
            body.type,
            body.payload,
            currentUserId,
        );
    }

    @Get('config')
    @RequirePermission('MUQEEM_CONFIG')
    @ApiOperation({ summary: 'جلب إعدادات مقيم للشركة' })
    getConfig(@CurrentUser('companyId') companyId: string) {
        return this.muqeemService.getConfig(companyId);
    }

    @Post('config')
    @RequirePermission('MUQEEM_CONFIG')
    @ApiOperation({ summary: 'تحديث إعدادات مقيم' })
    updateConfig(
        @CurrentUser('companyId') companyId: string,
        @Body() data: any,
    ) {
        return this.muqeemService.updateConfig(companyId, data);
    }
}
