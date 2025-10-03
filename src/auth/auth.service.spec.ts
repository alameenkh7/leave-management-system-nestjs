import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EmployeeService } from '../employee/employee.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Employee, EmployeeRole } from '../employee/employee.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let employeeService: jest.Mocked<EmployeeService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockEmployee: Partial<Employee> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    employeeCode: 'EMP001',
    name: 'Test Employee',
    email: 'test@example.com',
    department: 'IT',
    role: EmployeeRole.EMPLOYEE,
    joinDate: new Date('2023-01-01'),
    isActive: true,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
    password: 'hashedPassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmployeeService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    employeeService = module.get(EmployeeService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEmployee', () => {
    it('should return employee when credentials are valid', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateEmployee('test@example.com', 'password123');

      expect(employeeService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toEqual(mockEmployee);
    });

    it('should throw UnauthorizedException when employee not found', async () => {
      employeeService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateEmployee('nonexistent@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);

      expect(employeeService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.validateEmployee('test@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);

      expect(employeeService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    });

    it('should throw UnauthorizedException when employee is inactive', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      employeeService.findByEmail.mockResolvedValue(inactiveEmployee as Employee);

      await expect(
        service.validateEmployee('test@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);

      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should handle bcrypt errors gracefully', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never);

      await expect(
        service.validateEmployee('test@example.com', 'password123')
      ).rejects.toThrow('Bcrypt error');
    });
  });

  describe('login', () => {
    it('should return access token and employee info on successful login', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login('test@example.com', 'password123');

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockEmployee.email,
        sub: mockEmployee.id,
        role: mockEmployee.role,
      });
      expect(result).toEqual({
        access_token: 'jwt-token',
        employee: {
          id: mockEmployee.id,
          name: mockEmployee.name,
          email: mockEmployee.email,
          department: mockEmployee.department,
          role: mockEmployee.role,
        },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      employeeService.findByEmail.mockResolvedValue(null);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when employee is inactive', async () => {
      const inactiveEmployee = { ...mockEmployee, isActive: false };
      employeeService.findByEmail.mockResolvedValue(inactiveEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should include correct payload in JWT token', async () => {
      const adminEmployee = {
        ...mockEmployee,
        role: EmployeeRole.ADMIN,
        email: 'admin@example.com',
      };
      employeeService.findByEmail.mockResolvedValue(adminEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('admin-jwt-token');

      await service.login('admin@example.com', 'password123');

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'admin@example.com',
        sub: mockEmployee.id,
        role: EmployeeRole.ADMIN,
      });
    });

    it('should not include sensitive information in response', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result.employee).not.toHaveProperty('password');
      expect(result.employee).not.toHaveProperty('casualLeaveBalance');
      expect(result.employee).not.toHaveProperty('sickLeaveBalance');
      expect(result.employee).not.toHaveProperty('vacationLeaveBalance');
    });
  });

  describe('edge cases', () => {
    it('should handle empty email', async () => {
      const result = await service.validateEmployee('', 'password123');
      expect(result).toBeNull();
    });

    it('should handle empty password', async () => {
      const result = await service.validateEmployee('test@example.com', '');
      expect(result).toBeNull();
    });

    it('should handle null email from database', async () => {
      const employeeWithNullEmail = { ...mockEmployee, email: null };
      employeeService.findByEmail.mockResolvedValue(employeeWithNullEmail as any);

      const result = await service.validateEmployee('test@example.com', 'password123');
      expect(result).toBeNull();
    });

    it('should handle employee without password', async () => {
      const employeeWithoutPassword = { ...mockEmployee };
      delete employeeWithoutPassword.password;
      employeeService.findByEmail.mockResolvedValue(employeeWithoutPassword as Employee);

      const result = await service.validateEmployee('test@example.com', 'password123');
      expect(result).toBeNull();
    });

    it('should handle database errors in findByEmail', async () => {
      employeeService.findByEmail.mockRejectedValue(new Error('Database error'));

      await expect(
        service.validateEmployee('test@example.com', 'password123')
      ).rejects.toThrow('Database error');
    });

    it('should handle JWT service errors', async () => {
      employeeService.findByEmail.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('JWT error');
    });
  });
});