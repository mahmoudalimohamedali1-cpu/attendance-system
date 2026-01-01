import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsBoolean,
    Min,
    Max,
} from 'class-validator';

// DTO لتحديث الموقع من التطبيق
export class UpdateLocationDto {
    @ApiProperty({ description: 'خط العرض', example: 24.7136 })
    @IsNumber()
    @IsNotEmpty()
    @Min(-90)
    @Max(90)
    latitude: number;

    @ApiProperty({ description: 'خط الطول', example: 46.6753 })
    @IsNumber()
    @IsNotEmpty()
    @Min(-180)
    @Max(180)
    longitude: number;

    @ApiPropertyOptional({ description: 'دقة GPS بالمتر', example: 10 })
    @IsOptional()
    @IsNumber()
    accuracy?: number;

    @ApiPropertyOptional({ description: 'مستوى البطارية (0-100)', example: 85 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    batteryLevel?: number;

    @ApiPropertyOptional({ description: 'معلومات الجهاز' })
    @IsOptional()
    @IsString()
    deviceInfo?: string;
}

// DTO للاستعلام عن سجل المواقع
export class LocationHistoryQueryDto {
    @ApiPropertyOptional({ description: 'معرف الموظف (للمسؤولين)' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'عرض داخل النطاق فقط' })
    @IsOptional()
    @IsBoolean()
    insideOnly?: boolean;

    @ApiPropertyOptional({ description: 'الحد الأقصى للنتائج', default: 100 })
    @IsOptional()
    @IsNumber()
    @Max(500)
    limit?: number;
}

// DTO للموظف النشط (الحاضر)
export class ActiveEmployeeDto {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    branchName: string;
    departmentName?: string;
    checkInTime: Date;
    lastLocation?: {
        latitude: number;
        longitude: number;
        isInsideGeofence: boolean;
        distanceFromBranch: number;
        updatedAt: Date;
    };
    exitEvents: number; // عدد مرات الخروج اليوم
}

// DTO للموقع الحي
export class LiveLocationDto {
    userId: string;
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromBranch: number;
    accuracy?: number;
    batteryLevel?: number;
    updatedAt: Date;
}

// WebSocket Events
export class JoinTrackingDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
}

export class LocationUpdateEventDto {
    userId: string;
    location: LiveLocationDto;
}
