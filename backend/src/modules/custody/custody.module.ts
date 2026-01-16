import { Module, forwardRef } from "@nestjs/common";
import { CustodyController } from "./custody.controller";
import { CustodyService } from "./custody.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SmartPoliciesModule } from "../smart-policies/smart-policies.module";
import { AuditModule } from "../audit/audit.module";

@Module({
    imports: [
        NotificationsModule,
        PermissionsModule,
        forwardRef(() => SmartPoliciesModule),
        AuditModule,
    ],
    controllers: [CustodyController],
    providers: [CustodyService],
    exports: [CustodyService],
})
export class CustodyModule {}
