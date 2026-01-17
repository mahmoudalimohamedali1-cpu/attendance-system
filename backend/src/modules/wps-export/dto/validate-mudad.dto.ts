import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO للتحقق من صحة ملف WPS قبل التقديم إلى نظام مُدد
 * Validation options for MUDAD submission
 */
export class ValidateMudadDto {
    @ApiProperty({
        description: 'الوضع الصارم - يرفض أي تحذيرات | Strict mode - reject any warnings',
        required: false,
        default: false,
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    strictMode?: boolean;

    @ApiProperty({
        description: 'تخطي التحقق من بيانات الشركة | Skip company data validation',
        required: false,
        default: false,
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    skipCompanyValidation?: boolean;
}
