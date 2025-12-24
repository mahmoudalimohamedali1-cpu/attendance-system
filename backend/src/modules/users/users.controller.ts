import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ============ Profile Endpoints ============

  async getProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.getProfile(userId, companyId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'تعديل بيانات المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto, companyId);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'تغيير كلمة المرور' })
  @ApiResponse({ status: 200, description: 'تم تغيير كلمة المرور بنجاح' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  // ============ Admin Endpoints ============

  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.create(createUserDto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المستخدمين (حسب صلاحياتك)' })
  @ApiResponse({ status: 200, description: 'قائمة المستخدمين' })
  async findAll(
    @Request() req: any,
    @Query() query: UserQueryDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.findAll(query, companyId, req.user.id, req.user.role);
  }

  @Get('my-team')
  @Roles('MANAGER')
  @ApiOperation({ summary: 'موظفي الفريق (للمدير)' })
  @ApiResponse({ status: 200, description: 'قائمة موظفي الفريق' })
  async getMyTeam(
    @CurrentUser('id') managerId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.getEmployeesByManager(managerId, companyId);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'بيانات مستخدم محدد' })
  @ApiResponse({ status: 200, description: 'بيانات المستخدم' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.findOne(id, companyId);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تعديل مستخدم' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.update(id, updateUserDto, companyId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف/تعطيل مستخدم' })
  @ApiResponse({ status: 200, description: 'تم تعطيل المستخدم' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.remove(id, companyId);
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'تفعيل مستخدم' })
  @ApiResponse({ status: 200, description: 'تم تفعيل المستخدم' })
  async activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Post(':id/reset-face')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'إعادة تعيين الوجه المسجل للموظف' })
  @ApiResponse({ status: 200, description: 'تم إعادة تعيين الوجه بنجاح' })
  async resetFace(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.resetFace(id, companyId);
  }
  // Note: Import functionality moved to EmployeeImportController
}

