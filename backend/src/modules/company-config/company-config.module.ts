import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CompanyConfigController } from './company-config.controller';
import { CompanyConfigService } from './company-config.service';

@Module({
    imports: [PrismaModule],
    controllers: [CompanyConfigController],
    providers: [CompanyConfigService],
    exports: [CompanyConfigService],
})
export class CompanyConfigModule { }
