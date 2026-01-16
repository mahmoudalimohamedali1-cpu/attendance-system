import { Module, forwardRef } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { GeofenceService } from "./services/geofence.service";
import { TimezoneService } from "../../common/services/timezone.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [NotificationsModule, PermissionsModule, forwardRef(() => SmartPoliciesModule), SettingsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, GeofenceService, TimezoneService],
  exports: [AttendanceService, GeofenceService],
})
export class AttendanceModule { }
