import { Module, forwardRef } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { GeofenceService } from "./services/geofence.service";
import { IntegrityService } from "./services/integrity.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";

@Module({
  imports: [NotificationsModule, PermissionsModule, forwardRef(() => SmartPoliciesModule)],
  controllers: [AttendanceController],
  providers: [AttendanceService, GeofenceService, IntegrityService],
  exports: [AttendanceService, GeofenceService, IntegrityService],
})
export class AttendanceModule { }
