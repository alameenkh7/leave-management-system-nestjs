import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { Employee, EmployeeRole } from '../employee/employee.entity';
import { LeaveRequest, LeaveStatus, LeaveType } from '../leave/entities/leave-request.entity';

describe('AdminService', () => {
  let service: AdminService;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let leaveRequestRepository: jest.Mocked<Repository<LeaveRequest>>;

  const mockEmployees: Partial<Employee>[] = [
    {
      id: 'emp1',
      employeeCode: 'EMP001',
      name: 'Employee 1',
      email: 'emp1@test.com',
      department: 'Engineering',
      role: EmployeeRole.EMPLOYEE,
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    },
    {
      id: 'emp2',
      employeeCode: 'EMP002',
      name: 'Employee 2',
      email: 'emp2@test.com',
      department: 'HR',
      role: EmployeeRole.EMPLOYEE,
      isActive: true,
      casualLeaveBalance: 10,
      sickLeaveBalance: 8,
      vacationLeaveBalance: 15,
    },
    {
      id: 'mgr1',
      employeeCode: 'MGR001',
      name: 'Manager 1',
      email: 'mgr1@test.com',
      department: 'Engineering',
      role: EmployeeRole.REPORTING_MANAGER,
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    },
  ];

  const mockLeaveRequests: Partial<LeaveRequest>[] = [
    {
      id: 'leave1',
      employeeId: 'emp1',
      leaveType: LeaveType.CASUAL,
      status: LeaveStatus.PENDING,
      totalDays: 3,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-17'),
      reason: 'Family function',
    },
    {
      id: 'leave2',
      employeeId: 'emp2',
      leaveType: LeaveType.SICK,
      status: LeaveStatus.APPROVED,
      totalDays: 2,
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-01-11'),
      reason: 'Medical checkup',
    },
    {
      id: 'leave3',
      employeeId: 'emp1',
      leaveType: LeaveType.VACATION,
      status: LeaveStatus.REJECTED,
      totalDays: 5,
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-01-24'),
      reason: 'Vacation',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: {
            count: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    leaveRequestRepository = module.get(getRepositoryToken(LeaveRequest));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaveSummary', () => {
    it('should return correct leave summary statistics', async () => {
      leaveRequestRepository.count
        .mockResolvedValueOnce(10) // total requests
        .mockResolvedValueOnce(3)  // pending requests
        .mockResolvedValueOnce(5)  // approved requests
        .mockResolvedValueOnce(2)  // rejected requests
        .mockResolvedValueOnce(3)  // pending RM requests
        .mockResolvedValueOnce(1); // pending HR requests

      const result = await service.getLeaveSummary();

      expect(result).toEqual({
        totalRequests: 10,
        pendingRequests: 3,
        approvedRequests: 5,
        rejectedRequests: 2,
        pendingRMRequests: 3,
        pendingHRRequests: 1,
      });

      expect(leaveRequestRepository.count).toHaveBeenCalledTimes(6);
    });

    it('should handle zero counts correctly', async () => {
      leaveRequestRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getLeaveSummary();

      expect(result).toEqual({
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        pendingRMRequests: 0,
        pendingHRRequests: 0,
      });
    });

    it('should handle database errors', async () => {
      leaveRequestRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(service.getLeaveSummary()).rejects.toThrow('Database error');
    });
  });

  describe('getDepartmentStats', () => {
    it('should return department statistics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { employee_department: 'Engineering' },
          { employee_department: 'HR' },
        ]),
      };

      const mockLeaveQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };

      employeeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      employeeRepository.count.mockResolvedValue(2);
      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockLeaveQueryBuilder as any);
      mockLeaveQueryBuilder.getCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

      const result = await service.getDepartmentStats();

      expect(result).toEqual([
        {
          department: 'Engineering',
          totalEmployees: 2,
          totalLeaveRequests: 5,
          averageLeavePerEmployee: 2.5,
          pendingApprovals: 2,
        },
        {
          department: 'HR',
          totalEmployees: 2,
          totalLeaveRequests: 5,
          averageLeavePerEmployee: 2.5,
          pendingApprovals: 2,
        },
      ]);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith('employee.department');
      expect(mockQueryBuilder.distinct).toHaveBeenCalledWith(true);
    });

    it('should handle empty results', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      employeeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDepartmentStats();

      expect(result).toEqual([]);
    });

    it('should handle query builder errors', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockRejectedValue(new Error('Query error')),
      };

      employeeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.getDepartmentStats()).rejects.toThrow('Query error');
    });
  });

  describe('getAllPendingApprovals', () => {
    it('should return all pending leave requests with employee details', async () => {
      const mockPendingRequests = [
        {
          ...mockLeaveRequests[0],
          employee: mockEmployees[0],
        },
      ];

      leaveRequestRepository.find.mockResolvedValue(mockPendingRequests as LeaveRequest[]);

      const result = await service.getAllPendingApprovals();

      expect(leaveRequestRepository.find).toHaveBeenCalledWith({
        where: [
          { status: LeaveStatus.PENDING },
          { status: LeaveStatus.PENDING_HR },
        ],
        relations: ['employee', 'workflow'],
        order: { appliedAt: 'ASC' },
      });
      expect(result).toEqual(mockPendingRequests);
    });

    it('should return empty array when no pending approvals', async () => {
      leaveRequestRepository.find.mockResolvedValue([]);

      const result = await service.getAllPendingApprovals();

      expect(result).toEqual([]);
    });

    it('should handle database errors in getAllPendingApprovals', async () => {
      leaveRequestRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllPendingApprovals()).rejects.toThrow('Database error');
    });

    it('should order pending approvals by applied date ascending', async () => {
      leaveRequestRepository.find.mockResolvedValue([]);

      await service.getAllPendingApprovals();

      expect(leaveRequestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { appliedAt: 'ASC' },
        })
      );
    });

    it('should include employee and workflow relations in pending approvals', async () => {
      leaveRequestRepository.find.mockResolvedValue([]);

      await service.getAllPendingApprovals();

      expect(leaveRequestRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['employee', 'workflow'],
        })
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle repository connection errors', async () => {
      const connectionError = new Error('Connection failed');
      leaveRequestRepository.count.mockRejectedValue(connectionError);

      await expect(service.getLeaveSummary()).rejects.toThrow('Connection failed');
    });

    it('should handle division by zero in average calculation', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { employee_department: 'Engineering' },
        ]),
      };

      const mockLeaveQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };

      employeeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      employeeRepository.count.mockResolvedValue(0); // Zero employees
      leaveRequestRepository.createQueryBuilder.mockReturnValue(mockLeaveQueryBuilder as any);
      mockLeaveQueryBuilder.getCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

      const result = await service.getDepartmentStats();

      expect(result[0].averageLeavePerEmployee).toBe(0);
    });

    it('should handle very large numbers in statistics', async () => {
      leaveRequestRepository.count
        .mockResolvedValueOnce(999999)
        .mockResolvedValueOnce(100000)
        .mockResolvedValueOnce(500000)
        .mockResolvedValueOnce(399999)
        .mockResolvedValueOnce(100000)
        .mockResolvedValueOnce(50000);

      const result = await service.getLeaveSummary();

      expect(result).toEqual({
        totalRequests: 999999,
        pendingRequests: 100000,
        approvedRequests: 500000,
        rejectedRequests: 399999,
        pendingRMRequests: 100000,
        pendingHRRequests: 50000,
      });
    });

    it('should handle missing employee relations in pending approvals', async () => {
      const requestsWithoutEmployee = [
        { ...mockLeaveRequests[0], employee: null },
      ];

      leaveRequestRepository.find.mockResolvedValue(requestsWithoutEmployee as any);

      const result = await service.getAllPendingApprovals();

      expect(result).toEqual(requestsWithoutEmployee);
    });
  });
});