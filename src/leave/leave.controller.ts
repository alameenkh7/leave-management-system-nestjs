import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Employee } from '../employee/employee.entity';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(
    @CurrentUser() user: Employee,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.create(user.id, createLeaveRequestDto);
  }

  @Get()
  findAll(@CurrentUser() user: Employee) {
    return this.leaveService.findAll(user.id);
  }

  @Get('pending-approvals')
  getPendingApprovals(@CurrentUser() user: Employee) {
    return this.leaveService.getPendingApprovals(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Get(':id/approval-history')
  getApprovalHistory(@Param('id') id: string) {
    return this.leaveService.getApprovalHistory(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return this.leaveService.update(id, user.id, updateLeaveRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: Employee) {
    return this.leaveService.remove(id, user.id);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() approveLeaveDto: ApproveLeaveDto,
  ) {
    return this.leaveService.approve(id, user.id, approveLeaveDto);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() rejectLeaveDto: RejectLeaveDto,
  ) {
    return this.leaveService.reject(id, user.id, rejectLeaveDto);
  }
}
