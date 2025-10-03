import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Employee, EmployeeRole } from '../employee/employee.entity';
import {
  ApiApplyLeave,
  ApiGetMyLeaveRequests,
  ApiGetPendingApprovals,
  ApiGetLeaveRequestById,
  ApiGetApprovalHistory,
  ApiUpdateLeaveRequest,
  ApiCancelLeaveRequest,
  ApiApproveLeave,
  ApiRejectLeave,
} from './swagger/leave.swagger';

@ApiTags('Leave Requests')
@ApiBearerAuth('JWT-auth')
@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiApplyLeave()
  create(
    @CurrentUser() user: Employee,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.create(user.id, createLeaveRequestDto);
  }

  @Get()
  @ApiGetMyLeaveRequests()
  findAll(@CurrentUser() user: Employee) {
    return this.leaveService.findAll(user.id);
  }

  @Get('pending-approvals')
  @ApiGetPendingApprovals()
  getPendingApprovals(@CurrentUser() user: Employee) {
    return this.leaveService.getPendingApprovals(user.id);
  }

  @Get(':id')
  @ApiGetLeaveRequestById()
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Get(':id/approval-history')
  @ApiGetApprovalHistory()
  getApprovalHistory(@Param('id') id: string) {
    return this.leaveService.getApprovalHistory(id);
  }

  @Patch(':id')
  @ApiUpdateLeaveRequest()
  update(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return this.leaveService.update(id, user.id, updateLeaveRequestDto);
  }

  @Delete(':id')
  @ApiCancelLeaveRequest()
  remove(@Param('id') id: string, @CurrentUser() user: Employee) {
    return this.leaveService.remove(id, user.id);
  }

  @Post(':id/approve')
  @UseGuards(RoleGuard)
  @Roles(EmployeeRole.REPORTING_MANAGER, EmployeeRole.HR_MANAGER, EmployeeRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiApproveLeave()
  approve(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() approveLeaveDto: ApproveLeaveDto,
  ) {
    return this.leaveService.approve(id, user.id, approveLeaveDto);
  }

  @Post(':id/reject')
  @UseGuards(RoleGuard)
  @Roles(EmployeeRole.REPORTING_MANAGER, EmployeeRole.HR_MANAGER, EmployeeRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiRejectLeave()
  reject(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() rejectLeaveDto: RejectLeaveDto,
  ) {
    return this.leaveService.reject(id, user.id, rejectLeaveDto);
  }
}
