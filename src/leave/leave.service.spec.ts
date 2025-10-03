import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from './entities/leave-request.entity';
import {
  LeaveApproval,
  ApproverType,
  ApprovalAction,
} from './entities/leave-approval.entity';
import { LeaveWorkflow, WorkflowStage } from './entities/leave-workflow.entity';
import { EmployeeService } from '../employee/employee.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { Employee, EmployeeRole } from '../employee/employee.entity';

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRequestRepository: Repository<LeaveRequest>;
  let leaveApprovalRepository: Repository<LeaveApproval>;
  let leaveWorkflowRepository: Repository<LeaveWorkflow>;
  let employeeService: EmployeeService;

  const mockEmployee: Partial<Employee> = {
    id: 'employee-1',
    employeeCode: 'EMP001',
    name: 'John Doe',
    email: 'john@example.com',
    department: 'IT',
    role: EmployeeRole.EMPLOYEE,
    reportingManagerId: 'manager-1',
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
    isActive: true,
  };

  const mockManager: Partial<Employee> = {
    id: 'manager-1',
    employeeCode: 'MGR001',
    name: 'Jane Manager',
    email: 'manager@example.com',
    department: 'IT',
    role: EmployeeRole.REPORTING_MANAGER,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
    isActive: true,
  };

  const mockHRManager: Partial<Employee> = {
    id: 'hr-1',
    employeeCode: 'HR001',
    name: 'HR Manager',
    email: 'hr@example.com',
    department: 'HR',
    role: EmployeeRole.HR_MANAGER,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
    isActive: true,
  };

  const mockLeaveRequest: Partial<LeaveRequest> = {
    id: 'leave-1',
    employeeId: 'employee-1',
    employee: mockEmployee as Employee,
    leaveType: LeaveType.CASUAL,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-02'),
    totalDays: 2,
    reason: 'Personal work',
    status: LeaveStatus.PENDING,
    appliedAt: new Date(),
    approvals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorkflow: Partial<LeaveWorkflow> = {
    id: 'workflow-1',
    leaveRequestId: 'leave-1',
    leaveRequest: mockLeaveRequest as LeaveRequest,
    reportingManagerApproval: false,
    hrManagerApproval: false,
    currentStage: WorkflowStage.PENDING_RM,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      innerJoin: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(LeaveApproval),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeaveWorkflow),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: {
            findOne: jest.fn(),
            deductLeaveBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    leaveRequestRepository = module.get<Repository<LeaveRequest>>(
      getRepositoryToken(LeaveRequest),
    );
    leaveApprovalRepository = module.get<Repository<LeaveApproval>>(
      getRepositoryToken(LeaveApproval),
    );
    leaveWorkflowRepository = module.get<Repository<LeaveWorkflow>>(
      getRepositoryToken(LeaveWorkflow),
    );
    employeeService = module.get<EmployeeService>(EmployeeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createLeaveRequestDto: CreateLeaveRequestDto = {
      leaveType: LeaveType.CASUAL,
      startDate: '2025-12-01',
      endDate: '2025-12-02',
      reason: 'Personal work',
    };

    it('should create a leave request successfully', async () => {
      const savedLeaveRequest = { ...mockLeaveRequest, id: 'new-leave-id' };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockEmployee as any);
      jest
        .spyOn(leaveRequestRepository, 'create')
        .mockReturnValue(savedLeaveRequest as any);
      jest
        .spyOn(leaveRequestRepository, 'save')
        .mockResolvedValue(savedLeaveRequest as any);
      jest
        .spyOn(leaveWorkflowRepository, 'create')
        .mockReturnValue(mockWorkflow as any);
      jest
        .spyOn(leaveWorkflowRepository, 'save')
        .mockResolvedValue(mockWorkflow as any);

      const result = await service.create('employee-1', createLeaveRequestDto);

      expect(result).toEqual(savedLeaveRequest);
      expect(employeeService.findOne).toHaveBeenCalledWith('employee-1');
      expect(leaveRequestRepository.create).toHaveBeenCalled();
      expect(leaveRequestRepository.save).toHaveBeenCalled();
      expect(leaveWorkflowRepository.create).toHaveBeenCalled();
      expect(leaveWorkflowRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for past dates', async () => {
      const pastDateDto = {
        ...createLeaveRequestDto,
        startDate: '2023-01-01',
        endDate: '2023-01-02',
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockEmployee as any);

      await expect(service.create('employee-1', pastDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      const invalidDateDto = {
        ...createLeaveRequestDto,
        startDate: '2025-12-02',
        endDate: '2025-12-01',
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockEmployee as any);

      await expect(
        service.create('employee-1', invalidDateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient leave balance', async () => {
      const employeeWithNoBalance = {
        ...mockEmployee,
        casualLeaveBalance: 0,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(employeeWithNoBalance as any);

      await expect(
        service.create('employee-1', createLeaveRequestDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for casual leave without advance notice', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDto = {
        ...createLeaveRequestDto,
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0],
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockEmployee as any);

      await expect(service.create('employee-1', yesterdayDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for sick leave > 3 days without documents', async () => {
      const longSickLeaveDto = {
        ...createLeaveRequestDto,
        leaveType: LeaveType.SICK,
        startDate: '2025-12-01',
        endDate: '2025-12-05',
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockEmployee as any);

      await expect(
        service.create('employee-1', longSickLeaveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a leave request with relations', async () => {
      const leaveRequestWithRelations = {
        ...mockLeaveRequest,
        employee: mockEmployee,
        workflow: mockWorkflow,
        approvals: [],
      };

      jest
        .spyOn(leaveRequestRepository, 'findOne')
        .mockResolvedValue(leaveRequestWithRelations as any);

      const result = await service.findOne('leave-1');

      expect(result).toEqual(leaveRequestWithRelations);
      expect(leaveRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'leave-1' },
        relations: ['employee', 'workflow', 'approvals', 'approvals.approver'],
      });
    });

    it('should throw NotFoundException when leave request not found', async () => {
      jest.spyOn(leaveRequestRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    const approveDto: ApproveLeaveDto = {
      approverType: ApproverType.REPORTING_MANAGER,
      comments: 'Approved',
    };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockLeaveRequest,
        employee: { ...mockEmployee, reportingManagerId: 'manager-1' },
        workflow: mockWorkflow,
      } as any);
    });

    it('should approve leave request by reporting manager', async () => {
      const updatedWorkflow = {
        ...mockWorkflow,
        reportingManagerApproval: true,
        currentStage: WorkflowStage.PENDING_HR,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(mockWorkflow as any);
      jest.spyOn(leaveApprovalRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(leaveApprovalRepository, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(leaveWorkflowRepository, 'save')
        .mockResolvedValue(updatedWorkflow as any);
      jest.spyOn(leaveRequestRepository, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          employee: { ...mockEmployee, reportingManagerId: 'manager-1' },
          workflow: mockWorkflow,
        } as any)
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          status: LeaveStatus.PENDING_HR,
          workflow: updatedWorkflow,
        } as any);

      const result = await service.approve('leave-1', 'manager-1', approveDto);

      expect(result.status).toBe(LeaveStatus.PENDING_HR);
      expect(leaveApprovalRepository.create).toHaveBeenCalledWith({
        leaveRequestId: 'leave-1',
        approverId: 'manager-1',
        approverType: ApproverType.REPORTING_MANAGER,
        action: ApprovalAction.APPROVE,
        comments: 'Approved',
      });
    });

    it('should approve leave request by HR manager', async () => {
      const hrApproveDto: ApproveLeaveDto = {
        approverType: ApproverType.HR_MANAGER,
        comments: 'Approved by HR',
      };

      const workflowPendingHR = {
        ...mockWorkflow,
        currentStage: WorkflowStage.PENDING_HR,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockHRManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(workflowPendingHR as any);
      jest.spyOn(leaveApprovalRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(leaveApprovalRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(leaveApprovalRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveWorkflowRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveRequestRepository, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(employeeService, 'deductLeaveBalance')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          workflow: workflowPendingHR,
        } as any)
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          status: LeaveStatus.APPROVED,
        } as any);

      const result = await service.approve('leave-1', 'hr-1', hrApproveDto);

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(employeeService.deductLeaveBalance).toHaveBeenCalledWith(
        'employee-1',
        LeaveType.CASUAL,
        2,
      );
    });

    it('should throw ForbiddenException when employee tries to approve own request', async () => {
      await expect(
        service.approve('leave-1', 'employee-1', approveDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when workflow stage is incorrect', async () => {
      const wrongStageWorkflow = {
        ...mockWorkflow,
        currentStage: WorkflowStage.PENDING_HR,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(wrongStageWorkflow as any);

      await expect(
        service.approve('leave-1', 'manager-1', approveDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not the reporting manager', async () => {
      const otherManager = { ...mockManager, id: 'other-manager' };
      const workflowPendingRM = {
        ...mockWorkflow,
        currentStage: WorkflowStage.PENDING_RM,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockLeaveRequest,
        employee: { ...mockEmployee, reportingManagerId: 'manager-1' },
        workflow: workflowPendingRM,
      } as any);
      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(otherManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(workflowPendingRM as any);

      await expect(
        service.approve('leave-1', 'other-manager', approveDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockManager as any);
      jest.spyOn(leaveWorkflowRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.approve('leave-1', 'manager-1', approveDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    const rejectDto: RejectLeaveDto = {
      approverType: ApproverType.REPORTING_MANAGER,
      comments: 'Rejected due to workload',
    };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockLeaveRequest,
        employee: { ...mockEmployee, reportingManagerId: 'manager-1' },
        workflow: mockWorkflow,
      } as any);
    });

    it('should reject leave request by reporting manager', async () => {
      const workflowPendingRM = {
        ...mockWorkflow,
        currentStage: WorkflowStage.PENDING_RM,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(workflowPendingRM as any);
      jest.spyOn(leaveApprovalRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(leaveApprovalRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveWorkflowRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveRequestRepository, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          employee: { ...mockEmployee, reportingManagerId: 'manager-1' },
          workflow: workflowPendingRM,
        } as any)
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          status: LeaveStatus.REJECTED,
        } as any);

      const result = await service.reject('leave-1', 'manager-1', rejectDto);

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(leaveApprovalRepository.create).toHaveBeenCalledWith({
        leaveRequestId: 'leave-1',
        approverId: 'manager-1',
        approverType: ApproverType.REPORTING_MANAGER,
        action: ApprovalAction.REJECT,
        comments: 'Rejected due to workload',
      });
    });

    it('should reject leave request by HR manager', async () => {
      const hrRejectDto: RejectLeaveDto = {
        approverType: ApproverType.HR_MANAGER,
        comments: 'Rejected by HR',
      };

      const workflowPendingHR = {
        ...mockWorkflow,
        currentStage: WorkflowStage.PENDING_HR,
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockHRManager as any);
      jest
        .spyOn(leaveWorkflowRepository, 'findOne')
        .mockResolvedValue(workflowPendingHR as any);
      jest.spyOn(leaveApprovalRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(leaveApprovalRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveWorkflowRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(leaveRequestRepository, 'save').mockResolvedValue({} as any);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          workflow: workflowPendingHR,
        } as any)
        .mockResolvedValueOnce({
          ...mockLeaveRequest,
          status: LeaveStatus.REJECTED,
        } as any);

      const result = await service.reject('leave-1', 'hr-1', hrRejectDto);

      expect(result.status).toBe(LeaveStatus.REJECTED);
    });

    it('should throw ForbiddenException when employee tries to reject own request', async () => {
      await expect(
        service.reject('leave-1', 'employee-1', rejectDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateLeaveRequestDto = {
      reason: 'Updated reason',
    };

    it('should update leave request successfully', async () => {
      const updatedLeaveRequest = {
        ...mockLeaveRequest,
        reason: 'Updated reason',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeaveRequest as any);
      jest
        .spyOn(leaveRequestRepository, 'save')
        .mockResolvedValue(updatedLeaveRequest as any);

      const result = await service.update('leave-1', 'employee-1', updateDto);

      expect(result).toEqual(updatedLeaveRequest);
      expect(leaveRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to update non-pending leave', async () => {
      const approvedLeaveRequest = {
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
      };

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(approvedLeaveRequest as any);

      await expect(
        service.update('leave-1', 'employee-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when trying to update another employee's request", async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeaveRequest as any);

      await expect(
        service.update('leave-1', 'other-employee', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove leave request successfully', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeaveRequest as any);
      jest.spyOn(leaveRequestRepository, 'remove').mockResolvedValue({} as any);

      await service.remove('leave-1', 'employee-1');

      expect(leaveRequestRepository.remove).toHaveBeenCalledWith(
        mockLeaveRequest,
      );
    });

    it('should throw BadRequestException when trying to delete non-pending leave', async () => {
      const approvedLeaveRequest = {
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
      };

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(approvedLeaveRequest as any);

      await expect(service.remove('leave-1', 'employee-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when trying to delete another employee's request", async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockLeaveRequest as any);

      await expect(service.remove('leave-1', 'other-employee')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all leave requests for an employee', async () => {
      const leaveRequests = [mockLeaveRequest];

      jest
        .spyOn(leaveRequestRepository, 'find')
        .mockResolvedValue(leaveRequests as any);

      const result = await service.findAll('employee-1');

      expect(result).toEqual(leaveRequests);
      expect(leaveRequestRepository.find).toHaveBeenCalledWith({
        where: { employeeId: 'employee-1' },
        order: { appliedAt: 'DESC' },
      });
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for a leave request', async () => {
      const mockApproval = {
        id: 'approval-1',
        approver: mockManager,
        approverType: ApproverType.REPORTING_MANAGER,
        action: ApprovalAction.APPROVE,
        comments: 'Approved',
        timestamp: new Date(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockLeaveRequest,
        employee: mockEmployee,
      } as any);
      jest
        .spyOn(leaveApprovalRepository, 'find')
        .mockResolvedValue([mockApproval] as any);

      const result = await service.getApprovalHistory('leave-1');

      expect(result).toHaveProperty('leaveRequest');
      expect(result).toHaveProperty('approvals');
      expect(result.approvals).toHaveLength(1);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for reporting manager', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLeaveRequest]),
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockManager as any);
      jest
        .spyOn(leaveRequestRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(leaveRequestRepository, 'find').mockResolvedValue([]);

      const result = await service.getPendingApprovals('manager-1');

      expect(result).toEqual([mockLeaveRequest]);
    });

    it('should return pending approvals for HR manager', async () => {
      const pendingHRRequests = [
        {
          ...mockLeaveRequest,
          status: LeaveStatus.PENDING_HR,
        },
      ];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(employeeService, 'findOne')
        .mockResolvedValue(mockHRManager as any);
      jest
        .spyOn(leaveRequestRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);
      jest
        .spyOn(leaveRequestRepository, 'find')
        .mockResolvedValue(pendingHRRequests as any);

      const result = await service.getPendingApprovals('hr-1');

      expect(result).toEqual(pendingHRRequests);
    });
  });
});
