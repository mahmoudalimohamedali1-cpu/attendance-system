import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CalendarEventsService } from './calendar-events.service';
import { CalendarEventsController } from './calendar-events.controller';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService],
  exports: [CalendarEventsService],
})
export class CalendarEventsModule {}
