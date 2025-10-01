import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';

@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(@Request() req, @Body() createLeaveRequestDto: CreateLeaveRequestDto) {
    const employeeId = req.user?.id || req.body.employeeId;
    return this.leaveService.create(employeeId, createLeaveRequestDto);
  }

  @Get()
  findAll(@Request() req) {
    const employeeId = req.user?.id || req.query.employeeId;
    return this.leaveService.findAll(employeeId);
  }

  @Get('pending-approvals')
  getPendingApprovals(@Request() req) {
    const approverId = req.user?.id || req.query.approverId;
    return this.leaveService.getPendingApprovals(approverId);
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
    @Request() req,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    const employeeId = req.user?.id || req.body.employeeId;
    return this.leaveService.update(id, employeeId, updateLeaveRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const employeeId = req.user?.id || req.body.employeeId;
    return this.leaveService.remove(id, employeeId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Request() req,
    @Body() approveLeaveDto: ApproveLeaveDto,
  ) {
    const approverId = req.user?.id || req.body.approverId;
    return this.leaveService.approve(id, approverId, approveLeaveDto);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Request() req,
    @Body() rejectLeaveDto: RejectLeaveDto,
  ) {
    const approverId = req.user?.id || req.body.approverId;
    return this.leaveService.reject(id, approverId, rejectLeaveDto);
  }
}
