import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CustodyService } from './custody.service';
import {
    CreateCategoryCto, UpdateCategoryCto,
    CreateItemDto, UpdateItemDto,
    AssignCustodyDto, ApproveAssignmentDto, RejectAssignmentDto, SignAssignmentDto,
    RequestReturnDto, ReviewReturnDto,
    RequestTransferDto, ApproveTransferDto, RejectTransferDto,
    CreateMaintenanceDto, UpdateMaintenanceDto,
    CustodyQueryDto
} from './dto/custody.dto';

@Controller('custody')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustodyController {
    constructor(private readonly custodyService: CustodyService) { }

    // ==================== Categories ====================

    @Get('categories')
    @RequirePermission('CUSTODY_VIEW')
    getCategories(@CurrentUser() user: User) {
        return this.custodyService.getCategories(user.companyId!);
    }

    @Post('categories')
    @RequirePermission('CUSTODY_MANAGE_CATEGORIES')
    createCategory(@CurrentUser() user: User, @Body() dto: CreateCategoryCto) {
        return this.custodyService.createCategory(user.companyId!, user.id, dto);
    }

    @Patch('categories/:id')
    @RequirePermission('CUSTODY_MANAGE_CATEGORIES')
    updateCategory(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateCategoryCto) {
        return this.custodyService.updateCategory(user.companyId!, id, user.id, dto);
    }

    @Delete('categories/:id')
    @RequirePermission('CUSTODY_MANAGE_CATEGORIES')
    deleteCategory(@CurrentUser() user: User, @Param('id') id: string) {
        return this.custodyService.deleteCategory(user.companyId!, id, user.id);
    }

    // ==================== Items ====================

    @Get('items')
    @RequirePermission('CUSTODY_VIEW')
    getItems(@CurrentUser() user: User, @Query() query: CustodyQueryDto) {
        return this.custodyService.getItems(user.companyId!, query);
    }

    @Get('items/:id')
    @RequirePermission('CUSTODY_VIEW')
    getItem(@CurrentUser() user: User, @Param('id') id: string) {
        return this.custodyService.getItemById(user.companyId!, id);
    }

    @Post('items')
    @RequirePermission('CUSTODY_MANAGE_ITEMS')
    createItem(@CurrentUser() user: User, @Body() dto: CreateItemDto) {
        return this.custodyService.createItem(user.companyId!, user.id, dto);
    }

    @Patch('items/:id')
    @RequirePermission('CUSTODY_MANAGE_ITEMS')
    updateItem(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateItemDto) {
        return this.custodyService.updateItem(user.companyId!, id, user.id, dto);
    }

    @Delete('items/:id')
    @RequirePermission('CUSTODY_DELETE')
    deleteItem(@CurrentUser() user: User, @Param('id') id: string) {
        return this.custodyService.deleteItem(user.companyId!, id, user.id);
    }

    // ==================== Assignments ====================

    @Get('my-custody')
    @RequirePermission('CUSTODY_VIEW_SELF')
    getMyCustody(@CurrentUser() user: User) {
        return this.custodyService.getMyAssignments(user.companyId!, user.id);
    }

    @Get('assignments/pending')
    @RequirePermission('CUSTODY_ASSIGN')
    getPendingAssignments(@CurrentUser() user: User) {
        return this.custodyService.getPendingAssignments(user.companyId!);
    }

    @Post('assign')
    @RequirePermission('CUSTODY_ASSIGN')
    assignCustody(@CurrentUser() user: User, @Body() dto: AssignCustodyDto) {
        return this.custodyService.assignCustody(user.companyId!, user.id, dto);
    }

    @Post('assignments/approve')
    @RequirePermission('CUSTODY_ASSIGN')
    approveAssignment(@CurrentUser() user: User, @Body() dto: ApproveAssignmentDto) {
        return this.custodyService.approveAssignment(user.companyId!, user.id, dto);
    }

    @Post('assignments/reject')
    @RequirePermission('CUSTODY_ASSIGN')
    rejectAssignment(@CurrentUser() user: User, @Body() dto: RejectAssignmentDto) {
        return this.custodyService.rejectAssignment(user.companyId!, user.id, dto);
    }

    @Post('assignments/sign')
    @RequirePermission('CUSTODY_VIEW_SELF')
    signAssignment(@CurrentUser() user: User, @Body() dto: SignAssignmentDto) {
        return this.custodyService.signAssignment(user.companyId!, user.id, dto);
    }

    // ==================== Returns ====================

    @Get('returns/pending')
    @RequirePermission('CUSTODY_RETURN_REVIEW')
    getPendingReturns(@CurrentUser() user: User) {
        return this.custodyService.getPendingReturns(user.companyId!);
    }

    @Post('return/request')
    @RequirePermission('CUSTODY_RETURN_REQUEST')
    requestReturn(@CurrentUser() user: User, @Body() dto: RequestReturnDto) {
        return this.custodyService.requestReturn(user.companyId!, user.id, dto);
    }

    @Post('return/review')
    @RequirePermission('CUSTODY_RETURN_REVIEW')
    reviewReturn(@CurrentUser() user: User, @Body() dto: ReviewReturnDto) {
        return this.custodyService.reviewReturn(user.companyId!, user.id, dto);
    }

    // ==================== Transfers ====================

    @Get('transfers/pending')
    @RequirePermission('CUSTODY_VIEW_SELF')
    getMyPendingTransfers(@CurrentUser() user: User) {
        return this.custodyService.getPendingTransfers(user.companyId!, user.id);
    }

    @Get('transfers/all-pending')
    @RequirePermission('CUSTODY_TRANSFER_APPROVE')
    getAllPendingTransfers(@CurrentUser() user: User) {
        return this.custodyService.getPendingTransfers(user.companyId!);
    }

    @Post('transfer/request')
    @RequirePermission('CUSTODY_TRANSFER_REQUEST')
    requestTransfer(@CurrentUser() user: User, @Body() dto: RequestTransferDto) {
        return this.custodyService.requestTransfer(user.companyId!, user, dto);
    }

    @Post('transfer/approve')
    @RequirePermission('CUSTODY_VIEW_SELF')
    approveTransfer(@CurrentUser() user: User, @Body() dto: ApproveTransferDto) {
        return this.custodyService.approveTransfer(user.companyId!, user.id, dto);
    }

    @Post('transfer/reject')
    @RequirePermission('CUSTODY_VIEW_SELF')
    rejectTransfer(@CurrentUser() user: User, @Body() dto: RejectTransferDto) {
        return this.custodyService.rejectTransfer(user.companyId!, user.id, dto);
    }

    // ==================== Maintenance ====================

    @Get('maintenance')
    @RequirePermission('CUSTODY_MAINTENANCE')
    getMaintenances(@CurrentUser() user: User, @Query('status') status?: string) {
        return this.custodyService.getMaintenances(user.companyId!, status);
    }

    @Post('maintenance')
    @RequirePermission('CUSTODY_MAINTENANCE')
    createMaintenance(@CurrentUser() user: User, @Body() dto: CreateMaintenanceDto) {
        return this.custodyService.createMaintenance(user.companyId!, user.id, dto);
    }

    @Patch('maintenance/:id')
    @RequirePermission('CUSTODY_MAINTENANCE')
    updateMaintenance(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
        return this.custodyService.updateMaintenance(user.companyId!, id, user.id, dto);
    }

    // ==================== Dashboard & Reports ====================

    @Get('dashboard')
    @RequirePermission('CUSTODY_DASHBOARD')
    getDashboard(@CurrentUser() user: User) {
        return this.custodyService.getDashboard(user.companyId!);
    }

    @Get('reports/employee/:employeeId')
    @RequirePermission('CUSTODY_REPORTS')
    getEmployeeReport(@CurrentUser() user: User, @Param('employeeId') employeeId: string) {
        return this.custodyService.getEmployeeCustodyReport(user.companyId!, employeeId);
    }

    @Get('reports/my')
    @RequirePermission('CUSTODY_VIEW_SELF')
    getMyReport(@CurrentUser() user: User) {
        return this.custodyService.getEmployeeCustodyReport(user.companyId!, user.id);
    }
}

