import { Module, forwardRef } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { GeofenceService } from "./services/geofence.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";

@Module({
  imports: [NotificationsModule, PermissionsModule, forwardRef(() => SmartPoliciesModule)],
  controllers: [AttendanceController],
  providers: [AttendanceService, GeofenceService],
  exports: [AttendanceService, GeofenceService],
})
export class AttendanceModule { }
