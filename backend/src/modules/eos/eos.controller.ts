import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EosService } from './eos.service';
import { CalculateEosDto } from './dto/calculate-eos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('EOS - End of Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('eos')
export class EosController {
    constructor(private readonly service: EosService) { }

    @Post('calculate/:userId')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'حساب مكافأة نهاية الخدمة لموظف' })
    calculateEos(@Param('userId') userId: string, @Body() dto: CalculateEosDto) {
        return this.service.calculateEos(userId, dto);
    }
}
