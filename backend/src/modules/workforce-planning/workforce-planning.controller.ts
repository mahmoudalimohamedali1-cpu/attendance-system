import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkforcePlanningService } from './workforce-planning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Workforce Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workforce-planning')
export class WorkforcePlanningController {
    constructor(private readonly service: WorkforcePlanningService) { }

    @Get('forecast')
    @Roles('ADMIN', 'HR', 'MANAGER')
    @ApiOperation({ summary: 'Get workforce forecast' })
    @ApiQuery({ name: 'months', type: Number, required: false, example: 6 })
    async getForecast(
        @CurrentUser('companyId') companyId: string,
        @Query('months') months?: string,
    ): Promise<any> {
        return this.service.getForecast(companyId, parseInt(months || '6'));
    }
}
