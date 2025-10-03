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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Employee } from './employee.entity';

@ApiTags('Employees')
@Controller('employees')
@UseInterceptors(ClassSerializerInterceptor)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new employee',
    description: 'Create a new employee account. Admin access required.',
  })
  @ApiBody({
    type: CreateEmployeeDto,
    examples: {
      employee: {
        summary: 'Create Employee',
        value: {
          employeeCode: 'EMP123',
          name: 'John Doe',
          email: 'john.doe@company.com',
          password: 'password123',
          department: 'Engineering',
          role: 'employee',
          joinDate: '2024-01-15',
          reportingManagerId: '123e4567-e89b-12d3-a456-426614174000',
          casualLeaveBalance: 12,
          sickLeaveBalance: 10,
          vacationLeaveBalance: 18
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Employee created successfully', type: EmployeeResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Employee code or email already exists' })
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const employee = await this.employeeService.create(createEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all employees',
    description: 'Retrieve list of all employees. Admin access required.',
  })
  @ApiResponse({ status: 200, description: 'List of employees', type: [EmployeeResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll() {
    const employees = await this.employeeService.findAll();
    return employees.map((employee) => new EmployeeResponseDto(employee));
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Get the profile information of the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'User profile', type: EmployeeResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser() user: Employee) {
    return new EmployeeResponseDto(user);
  }

  @Get('me/leave-balance')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get my leave balance',
    description: 'Get the leave balance for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Leave balance information', type: LeaveBalanceResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyLeaveBalance(
    @CurrentUser() user: Employee,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeService.getLeaveBalance(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get employee by ID',
    description: 'Retrieve employee information by ID. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Employee information', type: EmployeeResponseDto })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findOne(@Param('id') id: string) {
    const employee = await this.employeeService.findOne(id);
    return new EmployeeResponseDto(employee);
  }

  @Get(':id/leave-balance')
  @ApiOperation({
    summary: 'Get employee leave balance',
    description: 'Get leave balance for a specific employee. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Leave balance information', type: LeaveBalanceResponseDto })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getLeaveBalance(
    @Param('id') id: string,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeService.getLeaveBalance(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update employee',
    description: 'Update employee information. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateEmployeeDto,
    examples: {
      update: {
        summary: 'Update Employee',
        value: {
          name: 'Updated Name',
          department: 'Updated Department',
          isActive: true
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Employee updated successfully', type: EmployeeResponseDto })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or employee code already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeService.update(id, updateEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Delete an employee account. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async remove(@Param('id') id: string) {
    await this.employeeService.remove(id);
    return { message: 'Employee deleted successfully' };
  }
}
