import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmployeeRole } from '../employee/employee.entity';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('leave-summary')
  @ApiOperation({
    summary: 'Get leave summary statistics',
    description: 'Retrieve system-wide leave statistics including total, pending, approved, and rejected requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave summary statistics',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number', example: 45 },
        pendingRequests: { type: 'number', example: 12 },
        approvedRequests: { type: 'number', example: 28 },
        rejectedRequests: { type: 'number', example: 5 },
        pendingRMRequests: { type: 'number', example: 8 },
        pendingHRRequests: { type: 'number', example: 4 }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or HR access required' })
  async getLeaveSummary() {
    return this.adminService.getLeaveSummary();
  }

  @Get('pending-approvals')
  @ApiOperation({
    summary: 'Get all pending approvals',
    description: 'Retrieve all leave requests pending approval across the organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending approvals',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          employee: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'John Doe' },
              employeeCode: { type: 'string', example: 'EMP001' },
              department: { type: 'string', example: 'Engineering' }
            }
          },
          leaveType: { type: 'string', example: 'casual' },
          startDate: { type: 'string', format: 'date', example: '2024-12-15' },
          endDate: { type: 'string', format: 'date', example: '2024-12-17' },
          totalDays: { type: 'number', example: 3 },
          reason: { type: 'string', example: 'Family function' },
          status: { type: 'string', example: 'pending' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or HR access required' })
  async getAllPendingApprovals() {
    return this.adminService.getAllPendingApprovals();
  }

  @Get('department-stats')
  @ApiOperation({
    summary: 'Get department statistics',
    description: 'Retrieve leave statistics grouped by department.',
  })
  @ApiResponse({
    status: 200,
    description: 'Department-wise statistics',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          department: { type: 'string', example: 'Engineering' },
          totalEmployees: { type: 'number', example: 15 },
          totalLeaveRequests: { type: 'number', example: 32 },
          averageLeavePerEmployee: { type: 'number', example: 2.13 },
          pendingApprovals: { type: 'number', example: 5 }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or HR access required' })
  async getDepartmentStats() {
    return this.adminService.getDepartmentStats();
  }
}