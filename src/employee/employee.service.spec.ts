import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeService } from './employee.service';
import { Employee, EmployeeRole } from './employee.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: jest.Mocked<Repository<Employee>>;

  const createMockEmployee = (): Partial<Employee> => ({
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
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    repository = module.get(getRepositoryToken(Employee));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createEmployeeDto = {
      employeeCode: 'EMP002',
      name: 'New Employee',
      email: 'new@example.com',
      password: 'password123',
      department: 'HR',
      role: EmployeeRole.EMPLOYEE,
      joinDate: new Date('2024-01-01'),
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    };

    it('should create a new employee successfully', async () => {
      const mockEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockEmployee as Employee);
      repository.save.mockResolvedValue(mockEmployee as Employee);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      const result = await service.create(createEmployeeDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: [
          { employeeCode: createEmployeeDto.employeeCode },
          { email: createEmployeeDto.email },
        ],
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createEmployeeDto.password, 10);
      expect(repository.create).toHaveBeenCalledWith({
        ...createEmployeeDto,
        password: 'hashedPassword',
      });
      expect(repository.save).toHaveBeenCalledWith(mockEmployee);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw ConflictException when employee code already exists', async () => {
      const mockEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(service.create(createEmployeeDto)).rejects.toThrow(ConflictException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: [
          { employeeCode: createEmployeeDto.employeeCode },
          { email: createEmployeeDto.email },
        ],
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const mockEmployee = createMockEmployee();
      const existingEmployee = { ...createMockEmployee(), email: createEmployeeDto.email };
      repository.findOne.mockResolvedValue(existingEmployee as Employee);

      await expect(service.create(createEmployeeDto)).rejects.toThrow(ConflictException);
    });

    it('should validate reporting manager when provided', async () => {
      const mockEmployee = createMockEmployee();
      const dtoWithManager = { ...createEmployeeDto, reportingManagerId: 'manager-id' };
      repository.findOne
        .mockResolvedValueOnce(null) // No existing employee
        .mockResolvedValueOnce(createMockEmployee() as Employee); // Manager exists
      repository.create.mockReturnValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(createMockEmployee() as Employee);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      await service.create(dtoWithManager);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'manager-id' },
      });
    });

    it('should throw NotFoundException when reporting manager not found', async () => {
      const dtoWithManager = { ...createEmployeeDto, reportingManagerId: 'invalid-manager-id' };
      repository.findOne
        .mockResolvedValueOnce(null) // No existing employee
        .mockResolvedValueOnce(null); // Manager not found

      await expect(service.create(dtoWithManager)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all employees with proper relations and select fields', async () => {
      const employees = [createMockEmployee(), { ...createMockEmployee(), id: 'another-id' }];
      repository.find.mockResolvedValue(employees as Employee[]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
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
      expect(result).toEqual(employees);
    });

    it('should return empty array when no employees exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return employee when found', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        relations: ['reportingManager'],
      });
      expect(result).toEqual(createMockEmployee());
    });

    it('should throw NotFoundException when employee not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return employee when found by email', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['reportingManager'],
      });
      expect(result).toEqual(createMockEmployee());
    });

    it('should return null when employee not found by email', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateEmployeeDto = {
      name: 'Updated Name',
      department: 'Updated Department',
    };

    it('should update employee successfully', async () => {
      const updatedEmployee = { ...createMockEmployee(), ...updateEmployeeDto };
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(updatedEmployee as Employee);

      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateEmployeeDto);

      expect(result).toEqual(updatedEmployee);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(updateEmployeeDto));
    });

    it('should throw NotFoundException when employee to update not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateEmployeeDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash password when updating password', async () => {
      const updateWithPassword = { ...updateEmployeeDto, password: 'newPassword' };
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(createMockEmployee() as Employee);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);

      await service.update('123e4567-e89b-12d3-a456-426614174000', updateWithPassword);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'newHashedPassword' })
      );
    });

    it('should validate unique email when updating email', async () => {
      const updateWithEmail = { email: 'new@example.com' };
      repository.findOne
        .mockResolvedValueOnce(createMockEmployee() as Employee) // Find employee to update
        .mockResolvedValueOnce({ ...createMockEmployee(), email: 'new@example.com' } as Employee); // Email exists

      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateWithEmail)
      ).rejects.toThrow(ConflictException);
    });

    it('should validate unique employee code when updating', async () => {
      const updateWithCode = { employeeCode: 'NEW001' };
      repository.findOne
        .mockResolvedValueOnce(createMockEmployee() as Employee) // Find employee to update
        .mockResolvedValueOnce({ ...createMockEmployee(), employeeCode: 'NEW001' } as Employee); // Code exists

      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateWithCode)
      ).rejects.toThrow(ConflictException);
    });

    it('should validate reporting manager when updating', async () => {
      const updateWithManager = { reportingManagerId: 'manager-id' };
      repository.findOne
        .mockResolvedValueOnce(createMockEmployee() as Employee) // Find employee to update
        .mockResolvedValueOnce(null); // Manager not found

      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateWithManager)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove employee successfully', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.remove.mockResolvedValue(createMockEmployee() as Employee);

      await service.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.remove).toHaveBeenCalledWith(createMockEmployee());
    });

    it('should throw NotFoundException when employee to remove not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLeaveBalance', () => {
    it('should return correct leave balance', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      const result = await service.getLeaveBalance('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual({
        casualLeave: {
          total: 12,
          used: 0,
          remaining: 12,
        },
        sickLeave: {
          total: 10,
          used: 0,
          remaining: 10,
        },
        vacationLeave: {
          total: 18,
          used: 0,
          remaining: 18,
        },
      });
    });

    it('should calculate used leave correctly', async () => {
      const employeeWithUsedLeave = {
        ...createMockEmployee(),
        casualLeaveBalance: 9,
        sickLeaveBalance: 7,
        vacationLeaveBalance: 15,
      };
      repository.findOne.mockResolvedValue(employeeWithUsedLeave as Employee);

      const result = await service.getLeaveBalance('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual({
        casualLeave: {
          total: 12,
          used: 3,
          remaining: 9,
        },
        sickLeave: {
          total: 10,
          used: 3,
          remaining: 7,
        },
        vacationLeave: {
          total: 18,
          used: 3,
          remaining: 15,
        },
      });
    });
  });

  describe('deductLeaveBalance', () => {
    it('should deduct casual leave balance successfully', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(createMockEmployee() as Employee);

      await service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'casual', 3);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ casualLeaveBalance: 9 })
      );
    });

    it('should deduct sick leave balance successfully', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(createMockEmployee() as Employee);

      await service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'sick', 2);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sickLeaveBalance: 8 })
      );
    });

    it('should deduct vacation leave balance successfully', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);
      repository.save.mockResolvedValue(createMockEmployee() as Employee);

      await service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'vacation', 5);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ vacationLeaveBalance: 13 })
      );
    });

    it('should throw BadRequestException when insufficient casual leave balance', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(
        service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'casual', 15)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient sick leave balance', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(
        service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'sick', 15)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient vacation leave balance', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(
        service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'vacation', 25)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid leave type', async () => {
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(
        service.deductLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'invalid', 1)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('restoreLeaveBalance', () => {
    it('should restore casual leave balance successfully', async () => {
      const freshEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(freshEmployee as Employee);
      repository.save.mockImplementation((emp) => Promise.resolve(emp));

      await service.restoreLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'casual', 3);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ casualLeaveBalance: 15 })
      );
    });

    it('should restore sick leave balance successfully', async () => {
      const freshEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(freshEmployee as Employee);
      repository.save.mockImplementation((emp) => Promise.resolve(emp));

      await service.restoreLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'sick', 2);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sickLeaveBalance: 12 })
      );
    });

    it('should restore vacation leave balance successfully', async () => {
      const freshEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(freshEmployee as Employee);
      repository.save.mockImplementation((emp) => Promise.resolve(emp));

      await service.restoreLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'vacation', 5);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ vacationLeaveBalance: 23 })
      );
    });

    it('should throw BadRequestException for invalid leave type in restore', async () => {
      const mockEmployee = createMockEmployee();
      repository.findOne.mockResolvedValue(createMockEmployee() as Employee);

      await expect(
        service.restoreLeaveBalance('123e4567-e89b-12d3-a456-426614174000', 'invalid', 1)
      ).rejects.toThrow(BadRequestException);
    });
  });
});