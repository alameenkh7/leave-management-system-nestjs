import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmployeeService } from '../employee/employee.service';
import * as bcrypt from 'bcrypt';
import { Employee } from '../employee/employee.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
  ) {}

  async validateEmployee(email: string, password: string): Promise<Employee> {
    const employee = await this.employeeService.findByEmail(email);
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return employee;
  }

  async login(email: string, password: string) {
    const employee = await this.validateEmployee(email, password);

    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
      },
    };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<Employee> {
    const employee = await this.employeeService.findOne(payload.sub);
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Employee not found or inactive');
    }
    return employee;
  }
}