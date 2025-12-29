import { PermissionsModule } from '../permissions/permissions.module';

@Module({
    imports: [PrismaModule, PdfModule, PermissionsModule],
    controllers: [PayslipsController],
    providers: [PayslipLinesService],
    exports: [PayslipLinesService],
})
export class PayslipsModule { }
