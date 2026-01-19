import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CalendarEventsService } from './calendar-events.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [],
  providers: [CalendarEventsService],
  exports: [CalendarEventsService],
})
export class CalendarEventsModule {}
