import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgramsService } from './programs.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/create-program.dto';

@ApiTags('Programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
    constructor(private readonly programsService: ProgramsService) {}

    @Post()
    @ApiOperation({ summary: 'إنشاء برنامج جديد' })
    create(@Request() req: any, @Body() dto: CreateProgramDto) {
        return this.programsService.create(req.user.companyId, dto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'جلب جميع البرامج' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    findAll(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.programsService.findAll(req.user.companyId, {
            status,
            search,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'جلب برنامج بالمعرف' })
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.programsService.findOne(req.user.companyId, id);
    }

    @Get(':id/dashboard')
    @ApiOperation({ summary: 'لوحة تحكم البرنامج' })
    getDashboard(@Request() req: any, @Param('id') id: string) {
        return this.programsService.getDashboard(req.user.companyId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'تحديث برنامج' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProgramDto) {
        return this.programsService.update(req.user.companyId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف برنامج' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.programsService.delete(req.user.companyId, id);
    }
}
