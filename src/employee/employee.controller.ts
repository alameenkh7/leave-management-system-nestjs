/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Employee, EmployeeRole } from './employee.entity';
import {
  ApiCreateEmployee,
  ApiGetAllEmployees,
  ApiGetMyProfile,
  ApiGetMyLeaveBalance,
  ApiGetEmployeeById,
  ApiGetEmployeeLeaveBalance,
  ApiUpdateEmployee,
  ApiDeleteEmployee,
} from './swagger/employee.swagger';

@ApiTags('Employees')
@ApiBearerAuth('JWT-auth')
@Controller('employees')
@UseInterceptors(ClassSerializerInterceptor)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiCreateEmployee()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const employee = await this.employeeService.create(createEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiGetAllEmployees()
  async findAll() {
    const employees = await this.employeeService.findAll();
    return employees.map((employee) => new EmployeeResponseDto(employee));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiGetMyProfile()
  async getMyProfile(@CurrentUser() user: Employee) {
    return new EmployeeResponseDto(user);
  }

  @Get('me/leave-balance')
  @UseGuards(JwtAuthGuard)
  @ApiGetMyLeaveBalance()
  async getMyLeaveBalance(
    @CurrentUser() user: Employee,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeService.getLeaveBalance(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiGetEmployeeById()
  async findOne(@Param('id') id: string) {
    const employee = await this.employeeService.findOne(id);
    return new EmployeeResponseDto(employee);
  }

  @Get(':id/leave-balance')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiGetEmployeeLeaveBalance()
  async getLeaveBalance(
    @Param('id') id: string,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeService.getLeaveBalance(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiUpdateEmployee()
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeService.update(id, updateEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(EmployeeRole.ADMIN, EmployeeRole.HR_MANAGER)
  @ApiDeleteEmployee()
  async remove(@Param('id') id: string) {
    await this.employeeService.remove(id);
    return { message: 'Employee deleted successfully' };
  }
}
