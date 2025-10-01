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
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto';

@Controller('employees')
@UseInterceptors(ClassSerializerInterceptor)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const employee = await this.employeeService.create(createEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Get()
  async findAll() {
    const employees = await this.employeeService.findAll();
    return employees.map((employee) => new EmployeeResponseDto(employee));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const employee = await this.employeeService.findOne(id);
    return new EmployeeResponseDto(employee);
  }

  @Get(':id/leave-balance')
  async getLeaveBalance(
    @Param('id') id: string,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeService.getLeaveBalance(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeService.update(id, updateEmployeeDto);
    return new EmployeeResponseDto(employee);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.employeeService.remove(id);
    return { message: 'Employee deleted successfully' };
  }
}
