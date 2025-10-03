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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Employee } from '../employee/employee.entity';

@ApiTags('Leave Requests')
@ApiBearerAuth('JWT-auth')
@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({
    summary: 'Apply for leave',
    description: 'Submit a new leave request. The request will be sent to the reporting manager for approval.',
  })
  @ApiBody({
    type: CreateLeaveRequestDto,
    examples: {
      casual: {
        summary: 'Casual Leave',
        value: {
          leaveType: 'casual',
          startDate: '2024-12-15',
          endDate: '2024-12-17',
          reason: 'Family function'
        }
      },
      sick: {
        summary: 'Sick Leave',
        value: {
          leaveType: 'sick',
          startDate: '2024-12-10',
          endDate: '2024-12-10',
          reason: 'Medical appointment'
        }
      },
      vacation: {
        summary: 'Vacation Leave',
        value: {
          leaveType: 'vacation',
          startDate: '2024-12-20',
          endDate: '2024-12-30',
          reason: 'Year-end vacation'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data or insufficient leave balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: Employee,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.create(user.id, createLeaveRequestDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get my leave requests',
    description: 'Retrieve all leave requests for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of leave requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: Employee) {
    return this.leaveService.findAll(user.id);
  }

  @Get('pending-approvals')
  @ApiOperation({
    summary: 'Get pending approvals',
    description: 'Get leave requests pending approval by the current user (for managers and HR).',
  })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have approval rights' })
  getPendingApprovals(@CurrentUser() user: Employee) {
    return this.leaveService.getPendingApprovals(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get leave request details',
    description: 'Retrieve details of a specific leave request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Leave request details' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Get(':id/approval-history')
  @ApiOperation({
    summary: 'Get approval history',
    description: 'Retrieve the complete approval history for a leave request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Approval history' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getApprovalHistory(@Param('id') id: string) {
    return this.leaveService.getApprovalHistory(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update leave request',
    description: 'Update a pending leave request. Only pending requests can be modified.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateLeaveRequestDto,
    examples: {
      update: {
        summary: 'Update leave request',
        value: {
          endDate: '2024-12-18',
          reason: 'Updated reason for leave'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Leave request updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify non-pending request' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot modify other user\'s request' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
  ) {
    return this.leaveService.update(id, user.id, updateLeaveRequestDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel leave request',
    description: 'Cancel a pending leave request. Only pending requests can be cancelled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Leave request cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending request' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot cancel other user\'s request' })
  remove(@Param('id') id: string, @CurrentUser() user: Employee) {
    return this.leaveService.remove(id, user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve leave request',
    description: 'Approve a leave request. Reporting managers approve first, then HR managers provide final approval.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: ApproveLeaveDto,
    examples: {
      manager: {
        summary: 'Manager Approval',
        value: {
          comments: 'Approved for family function',
          approverType: 'reporting_manager'
        }
      },
      hr: {
        summary: 'HR Approval',
        value: {
          comments: 'Final approval from HR',
          approverType: 'hr_manager'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Leave request approved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid approval or wrong workflow stage' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to approve' })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() approveLeaveDto: ApproveLeaveDto,
  ) {
    return this.leaveService.approve(id, user.id, approveLeaveDto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject leave request',
    description: 'Reject a leave request with comments. Can be done by reporting manager or HR manager.',
  })
  @ApiParam({
    name: 'id',
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: RejectLeaveDto,
    examples: {
      manager: {
        summary: 'Manager Rejection',
        value: {
          comments: 'Project deadline conflicts',
          approverType: 'reporting_manager'
        }
      },
      hr: {
        summary: 'HR Rejection',
        value: {
          comments: 'Too many vacation requests for this period',
          approverType: 'hr_manager'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Leave request rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rejection or wrong workflow stage' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to reject' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: Employee,
    @Body() rejectLeaveDto: RejectLeaveDto,
  ) {
    return this.leaveService.reject(id, user.id, rejectLeaveDto);
  }
}
