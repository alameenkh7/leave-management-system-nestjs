import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmployeeRole } from '../employee/employee.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('leave-summary')
  async getLeaveSummary() {
    return this.adminService.getLeaveSummary();
  }

  @Get('pending-approvals')
  async getAllPendingApprovals() {
    return this.adminService.getAllPendingApprovals();
  }

  @Get('department-stats')
  async getDepartmentStats() {
    return this.adminService.getDepartmentStats();
  }
}