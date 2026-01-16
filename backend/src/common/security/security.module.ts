import { Module, Global } from '@nestjs/common';
import { FormulaSecurityService } from './formula-security.service';

@Global()
@Module({
    providers: [FormulaSecurityService],
    exports: [FormulaSecurityService],
})
export class SecurityModule {}
