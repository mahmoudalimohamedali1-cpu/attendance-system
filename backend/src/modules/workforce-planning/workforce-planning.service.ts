import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DemandForecastingService } from './services/demand-forecasting.service';
import { ForecastRequestDto } from './dto/forecast.dto';

@Injectable()
export class WorkforcePlanningService {
    private readonly logger = new Logger(WorkforcePlanningService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly demandForecastingService: DemandForecastingService,
    ) { }

    /**
     * Get workforce forecast
     */
    async getForecast(companyId: string, months: number): Promise<any> {
        this.logger.debug(`Generating workforce forecast for company ${companyId}, months: ${months}`);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        const requestDto: ForecastRequestDto = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };

        return this.demandForecastingService.generateForecast(companyId, requestDto);
    }
}
