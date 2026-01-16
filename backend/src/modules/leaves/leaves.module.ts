import { Module, forwardRef } from "@nestjs/common";
import { LeavesController } from "./leaves.controller";
import { LeavesService } from "./leaves.service";
import { LeaveCalculationService } from "./leave-calculation.service";
import { LeaveTypeConfigService } from "./leave-type-config.service";
import { LeaveBalanceService } from "./leave-balance.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { UploadModule } from "../../common/upload/upload.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";
import { TimezoneService } from "../../common/services/timezone.service";

@Module({
  imports: [NotificationsModule, UploadModule, PermissionsModule, forwardRef(() => SmartPoliciesModule)],
  controllers: [LeavesController],
  providers: [
    LeavesService,
    LeaveCalculationService,
    LeaveTypeConfigService,
    LeaveBalanceService,
    TimezoneService,
  ],
  exports: [
    LeavesService,
    LeaveCalculationService,
    LeaveTypeConfigService,
    LeaveBalanceService,
  ],
})
export class LeavesModule { }

