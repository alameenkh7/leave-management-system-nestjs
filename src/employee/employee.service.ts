import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LeaveBalanceResponseDto } from './dto/leave-balance-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Check if employee code already exists
    const existingEmployee = await this.employeeRepository.findOne({
      where: [
        { employeeCode: createEmployeeDto.employeeCode },
        { email: createEmployeeDto.email },
      ],
    });

    if (existingEmployee) {
      throw new ConflictException('Employee code or email already exists');
    }

    // Validate reporting manager if provided
    if (createEmployeeDto.reportingManagerId) {
      const manager = await this.employeeRepository.findOne({
        where: { id: createEmployeeDto.reportingManagerId },
      });

      if (!manager) {
        throw new NotFoundException('Reporting manager not found');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      password: hashedPassword,
    } satisfies CreateEmployeeDto);

    return this.employeeRepository.save(employee);
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: ['reportingManager'],
      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        department: true,
        role: true,
        reportingManagerId: true,
        joinDate: true,
        isActive: true,
        casualLeaveBalance: true,
        sickLeaveBalance: true,
        vacationLeaveBalance: true,
      },
    });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['reportingManager'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async findByEmail(email: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { email },
      relations: ['reportingManager'],
    });

    if (!employee) {
      throw new NotFoundException(`Employee with email ${email} not found`);
    }

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    const employee = await this.findOne(id);

    // If updating email or employee code, check for duplicates
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (existingEmployee) {
        throw new ConflictException('Email already exists');
      }
    }

    if (
      updateEmployeeDto.employeeCode &&
      updateEmployeeDto.employeeCode !== employee.employeeCode
    ) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { employeeCode: updateEmployeeDto.employeeCode },
      });

      if (existingEmployee) {
        throw new ConflictException('Employee code already exists');
      }
    }

    // Hash password if updating
    if (updateEmployeeDto.password) {
      updateEmployeeDto.password = await bcrypt.hash(
        updateEmployeeDto.password,
        10,
      );
    }

    // Validate reporting manager if updating
    if (updateEmployeeDto.reportingManagerId) {
      const manager = await this.employeeRepository.findOne({
        where: { id: updateEmployeeDto.reportingManagerId },
      });

      if (!manager) {
        throw new NotFoundException('Reporting manager not found');
      }
    }

    Object.assign(employee, updateEmployeeDto);
    return this.employeeRepository.save(employee);
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeeRepository.remove(employee);
  }

  async getLeaveBalance(employeeId: string): Promise<LeaveBalanceResponseDto> {
    const employee = await this.findOne(employeeId);
    
    return {
      casualLeave: {
        total: 12,
        used: 12 - employee.casualLeaveBalance,
        remaining: employee.casualLeaveBalance,
      },
      sickLeave: {
        total: 10,
        used: 10 - employee.sickLeaveBalance,
        remaining: employee.sickLeaveBalance,
      },
      vacationLeave: {
        total: 18,
        used: 18 - employee.vacationLeaveBalance,
        remaining: employee.vacationLeaveBalance,
      },
    };
  }

  async deductLeaveBalance(
    employeeId: string,
    leaveType: string,
    days: number,
  ): Promise<void> {
    const employee = await this.findOne(employeeId);

    switch (leaveType) {
      case 'casual':
        if (employee.casualLeaveBalance < days) {
          throw new BadRequestException('Insufficient casual leave balance');
        }
        employee.casualLeaveBalance -= days;
        break;
      case 'sick':
        if (employee.sickLeaveBalance < days) {
          throw new BadRequestException('Insufficient sick leave balance');
        }
        employee.sickLeaveBalance -= days;
        break;
      case 'vacation':
        if (employee.vacationLeaveBalance < days) {
          throw new BadRequestException('Insufficient vacation leave balance');
        }
        employee.vacationLeaveBalance -= days;
        break;
      default:
        throw new BadRequestException('Invalid leave type');
    }

    await this.employeeRepository.save(employee);
  }

  async restoreLeaveBalance(
    employeeId: string,
    leaveType: string,
    days: number,
  ): Promise<void> {
    const employee = await this.findOne(employeeId);

    switch (leaveType) {
      case 'casual':
        employee.casualLeaveBalance += days;
        break;
      case 'sick':
        employee.sickLeaveBalance += days;
        break;
      case 'vacation':
        employee.vacationLeaveBalance += days;
        break;
      default:
        throw new BadRequestException('Invalid leave type');
    }

    await this.employeeRepository.save(employee);
  }
}
