import { Module, forwardRef } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { GeofenceService } from "./services/geofence.service";
import { TimezoneService } from "../../common/services/timezone.service";
import { IntegrityService } from "./services/integrity.service";
import { BreaksService } from "./services/breaks.service";
import { BreaksController } from "./services/breaks.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [NotificationsModule, PermissionsModule, forwardRef(() => SmartPoliciesModule), SettingsModule],
  controllers: [AttendanceController, BreaksController],
  providers: [AttendanceService, GeofenceService, TimezoneService, IntegrityService, BreaksService],
  exports: [AttendanceService, GeofenceService, IntegrityService, BreaksService],
})
export class AttendanceModule { }
