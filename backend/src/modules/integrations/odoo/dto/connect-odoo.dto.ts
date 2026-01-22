import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectOdooDto {
    @ApiProperty({ description: 'Odoo instance URL', example: 'https://company.odoo.com' })
    @IsString()
    @IsNotEmpty()
    odooUrl: string;

    @ApiProperty({ description: 'Database name', example: 'company_db' })
    @IsString()
    @IsNotEmpty()
    database: string;

    @ApiProperty({ description: 'Username or email', example: 'admin@company.com' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ description: 'Password or API key' })
    @IsString()
    @IsNotEmpty()
    apiKey: string;

    @ApiPropertyOptional({ description: 'Sync interval in minutes', default: 5 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(60)
    syncInterval?: number = 5;

    @ApiPropertyOptional({ description: 'Enable auto sync', default: true })
    @IsOptional()
    @IsBoolean()
    autoSync?: boolean = true;

    @ApiPropertyOptional({ description: 'Use JSON-RPC Stealth Mode (for blocked APIs)', default: false })
    @IsOptional()
    @IsBoolean()
    useStealthMode?: boolean = false;
}

export class TestOdooConnectionDto {
    @ApiProperty({ description: 'Odoo instance URL' })
    @IsString()
    @IsNotEmpty()
    odooUrl: string;

    @ApiProperty({ description: 'Database name' })
    @IsString()
    @IsNotEmpty()
    database: string;

    @ApiProperty({ description: 'Username' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ description: 'API key or password' })
    @IsString()
    @IsNotEmpty()
    apiKey: string;

    @ApiPropertyOptional({ description: 'Use JSON-RPC Stealth Mode' })
    @IsOptional()
    @IsBoolean()
    useStealthMode?: boolean = false;
}
