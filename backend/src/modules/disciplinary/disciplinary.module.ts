import { Module, forwardRef } from "@nestjs/common";
import { DisciplinaryService } from "./disciplinary.service";
import { DisciplinaryController } from "./disciplinary.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";

@Module({
    imports: [
        NotificationsModule,
        PermissionsModule,
        forwardRef(() => SmartPoliciesModule),
    ],
    controllers: [DisciplinaryController],
    providers: [DisciplinaryService],
    exports: [DisciplinaryService],
})
export class DisciplinaryModule {}
