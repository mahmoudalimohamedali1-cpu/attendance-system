import { PrismaService } from '../../common/prisma/prisma.service';
import { CalculateEosDto, EosBreakdown } from './dto/calculate-eos.dto';
import { LeaveCalculationService } from '../leaves/leave-calculation.service';
export declare class EosService {
    private prisma;
    private leaveCalculationService;
    constructor(prisma: PrismaService, leaveCalculationService: LeaveCalculationService);
    private calculateServiceDuration;
    calculateEos(userId: string, dto: CalculateEosDto): Promise<EosBreakdown>;
}
