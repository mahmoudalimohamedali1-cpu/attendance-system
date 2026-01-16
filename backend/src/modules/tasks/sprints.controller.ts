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
import { SprintsService, CreateSprintDto, UpdateSprintDto, SprintTasksDto } from './sprints.service';

@ApiTags('Sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sprints')
export class SprintsController {
    constructor(private readonly sprintsService: SprintsService) {}

    @Post()
    @ApiOperation({ summary: 'إنشاء سبرنت جديد' })
    create(@Request() req: any, @Body() dto: CreateSprintDto) {
        return this.sprintsService.create(req.user.companyId, req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'جلب جميع السبرنتات' })
    @ApiQuery({ name: 'status', required: false, enum: ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] })
    findAll(@Request() req: any, @Query('status') status?: string) {
        return this.sprintsService.findAll(req.user.companyId, status as any);
    }

    @Get('active')
    @ApiOperation({ summary: 'جلب السبرنت النشط' })
    getActive(@Request() req: any) {
        return this.sprintsService.getActive(req.user.companyId);
    }

    @Get('velocity')
    @ApiOperation({ summary: 'جلب تاريخ السرعة' })
    @ApiQuery({ name: 'limit', required: false })
    getVelocityHistory(@Request() req: any, @Query('limit') limit?: string) {
        return this.sprintsService.getVelocityHistory(req.user.companyId, limit ? parseInt(limit) : undefined);
    }

    @Get(':id')
    @ApiOperation({ summary: 'جلب سبرنت بالمعرف' })
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.sprintsService.findOne(req.user.companyId, id);
    }

    @Get(':id/burndown')
    @ApiOperation({ summary: 'جلب بيانات Burndown للسبرنت' })
    getBurndown(@Request() req: any, @Param('id') id: string) {
        return this.sprintsService.getBurndown(req.user.companyId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'تحديث سبرنت' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSprintDto) {
        return this.sprintsService.update(req.user.companyId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'حذف سبرنت' })
    delete(@Request() req: any, @Param('id') id: string) {
        return this.sprintsService.delete(req.user.companyId, id);
    }

    @Post(':id/start')
    @ApiOperation({ summary: 'بدء السبرنت' })
    start(@Request() req: any, @Param('id') id: string) {
        return this.sprintsService.start(req.user.companyId, id);
    }

    @Post(':id/complete')
    @ApiOperation({ summary: 'إكمال السبرنت' })
    complete(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { moveIncompleteTo?: string },
    ) {
        return this.sprintsService.complete(req.user.companyId, id, body.moveIncompleteTo);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'إلغاء السبرنت' })
    cancel(@Request() req: any, @Param('id') id: string) {
        return this.sprintsService.cancel(req.user.companyId, id);
    }

    @Post(':id/tasks')
    @ApiOperation({ summary: 'إضافة مهام للسبرنت' })
    addTasks(@Request() req: any, @Param('id') id: string, @Body() dto: SprintTasksDto) {
        return this.sprintsService.addTasks(req.user.companyId, id, dto.taskIds);
    }

    @Delete(':id/tasks')
    @ApiOperation({ summary: 'إزالة مهام من السبرنت' })
    removeTasks(@Request() req: any, @Param('id') id: string, @Body() dto: SprintTasksDto) {
        return this.sprintsService.removeTasks(req.user.companyId, id, dto.taskIds);
    }
}
