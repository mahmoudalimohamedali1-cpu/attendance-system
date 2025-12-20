import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PoliciesController],
    providers: [PoliciesService],
    exports: [PoliciesService],
})
export class PoliciesModule { }
