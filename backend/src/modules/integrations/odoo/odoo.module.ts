import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { OdooController } from './odoo.controller';
import { OdooService } from './odoo.service';

@Module({
    imports: [PrismaModule],
    controllers: [OdooController],
    providers: [OdooService],
    exports: [OdooService],
})
export class OdooModule { }
