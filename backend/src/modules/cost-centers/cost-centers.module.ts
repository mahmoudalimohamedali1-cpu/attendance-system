import { Module } from '@nestjs/common';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CostCentersController],
    providers: [CostCentersService],
    exports: [CostCentersService],
})
export class CostCentersModule { }
