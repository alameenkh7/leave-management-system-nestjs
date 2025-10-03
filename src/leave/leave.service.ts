import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { EmployeeService } from '../employee/employee.service';
import { ApprovalHistoryResponseDto } from './dto/approval-history-response.dto';
import { EmployeeRole } from '../employee/employee.entity';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveApproval)
    private readonly leaveApprovalRepository: Repository<LeaveApproval>,
    @InjectRepository(LeaveWorkflow)
    private readonly leaveWorkflowRepository: Repository<LeaveWorkflow>,
    private readonly employeeService: EmployeeService,
  ) {}

  async create(
    employeeId: string,
    createLeaveRequestDto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const employee = await this.employeeService.findOne(employeeId);

    const startDate = new Date(createLeaveRequestDto.startDate);
    const endDate = new Date(createLeaveRequestDto.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new BadRequestException('Cannot apply for leave on past dates');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const totalDays = this.calculateWorkingDays(startDate, endDate);

    if (totalDays === 0) {
      throw new BadRequestException(
        'Cannot apply for leave on weekend-only periods',
      );
    }

    if (createLeaveRequestDto.leaveType === LeaveType.CASUAL) {
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) {
        throw new BadRequestException(
          'Casual leave requires minimum 1 day advance notice',
        );
      }
    }

    if (
      createLeaveRequestDto.leaveType === LeaveType.SICK &&
      totalDays > 3 &&
      !createLeaveRequestDto.documents
    ) {
      throw new BadRequestException(
        'Medical certificate required for sick leave > 3 days',
      );
    }

    await this.validateLeaveBalance(
      employee.id,
      createLeaveRequestDto.leaveType,
      totalDays,
    );

    await this.checkOverlappingLeaves(employeeId, startDate, endDate);

    const leaveRequest = this.leaveRequestRepository.create({
      ...createLeaveRequestDto,
      employeeId,
      totalDays,
      status: LeaveStatus.PENDING,
    });

    const savedLeaveRequest =
      await this.leaveRequestRepository.save(leaveRequest);

    const workflow = this.leaveWorkflowRepository.create({
      leaveRequestId: savedLeaveRequest.id,
      currentStage: WorkflowStage.PENDING_RM,
    });

    await this.leaveWorkflowRepository.save(workflow);

    return savedLeaveRequest;
  }

  async findAll(employeeId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.find({
      where: { employeeId },
      order: { appliedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'workflow', 'approvals', 'approvals.approver'],
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leaveRequest;
  }

  async update(
    id: string,
    employeeId: string,
    updateLeaveRequestDto: UpdateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(id);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Can only update leave requests in pending status',
      );
    }

    if (leaveRequest.employeeId !== employeeId) {
      throw new ForbiddenException(
        'You can only update your own leave requests',
      );
    }

    if (updateLeaveRequestDto.startDate || updateLeaveRequestDto.endDate) {
      const startDate = new Date(
        updateLeaveRequestDto.startDate || leaveRequest.startDate,
      );
      const endDate = new Date(
        updateLeaveRequestDto.endDate || leaveRequest.endDate,
      );

      const totalDays = this.calculateWorkingDays(startDate, endDate);
      updateLeaveRequestDto['totalDays'] = totalDays;
    }

    Object.assign(leaveRequest, updateLeaveRequestDto);
    return this.leaveRequestRepository.save(leaveRequest);
  }

  async remove(id: string, employeeId: string): Promise<void> {
    const leaveRequest = await this.findOne(id);

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Can only delete leave requests in pending status',
      );
    }

    if (leaveRequest.employeeId !== employeeId) {
      throw new ForbiddenException(
        'You can only delete your own leave requests',
      );
    }

    await this.leaveRequestRepository.remove(leaveRequest);
  }

  async approve(
    leaveRequestId: string,
    approverId: string,
    approveLeaveDto: ApproveLeaveDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(leaveRequestId);
    const approver = await this.employeeService.findOne(approverId);

    if (leaveRequest.employeeId === approverId) {
      throw new ForbiddenException('Cannot approve your own leave request');
    }

    const workflow = await this.leaveWorkflowRepository.findOne({
      where: { leaveRequestId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (approveLeaveDto.approverType === ApproverType.REPORTING_MANAGER) {
      if (workflow.currentStage !== WorkflowStage.PENDING_RM) {
        throw new BadRequestException(
          'Leave is not in reporting manager approval stage',
        );
      }

      if (leaveRequest.employee.reportingManagerId !== approverId) {
        throw new ForbiddenException(
          'You are not the reporting manager for this employee',
        );
      }

      workflow.reportingManagerApproval = true;
      workflow.currentStage = WorkflowStage.PENDING_HR;
      leaveRequest.status = LeaveStatus.PENDING_HR;
    } else if (approveLeaveDto.approverType === ApproverType.HR_MANAGER) {
      if (workflow.currentStage !== WorkflowStage.PENDING_HR) {
        throw new BadRequestException(
          'Leave is not in HR manager approval stage',
        );
      }

      if (approver.role !== EmployeeRole.HR_MANAGER) {
        throw new ForbiddenException('You are not authorized as HR manager');
      }

      const rmApproval = await this.leaveApprovalRepository.findOne({
        where: {
          leaveRequestId,
          approverType: ApproverType.REPORTING_MANAGER,
        },
      });

      if (rmApproval && rmApproval.approverId === approverId) {
        throw new ForbiddenException(
          'Reporting manager and HR manager must be different',
        );
      }

      workflow.hrManagerApproval = true;
      workflow.currentStage = WorkflowStage.COMPLETED;
      leaveRequest.status = LeaveStatus.APPROVED;

      await this.employeeService.deductLeaveBalance(
        leaveRequest.employeeId,
        leaveRequest.leaveType,
        leaveRequest.totalDays,
      );
    }

    const approval = this.leaveApprovalRepository.create({
      leaveRequestId: leaveRequest.id,
      approverId,
      approverType: approveLeaveDto.approverType,
      action: ApprovalAction.APPROVE,
      comments: approveLeaveDto.comments,
    });

    try {
      await this.leaveWorkflowRepository.save(workflow);
      await this.leaveRequestRepository.save(leaveRequest);
      await this.leaveApprovalRepository.save(approval);
    } catch (error) {
      console.error('Error saving entities:', error);
      throw error;
    }

    return this.findOne(leaveRequest.id);
  }

  async reject(
    leaveRequestId: string,
    approverId: string,
    rejectLeaveDto: RejectLeaveDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findOne(leaveRequestId);
    const approver = await this.employeeService.findOne(approverId);

    if (leaveRequest.employeeId === approverId) {
      throw new ForbiddenException('Cannot reject your own leave request');
    }

    const workflow = await this.leaveWorkflowRepository.findOne({
      where: { leaveRequestId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (rejectLeaveDto.approverType === ApproverType.REPORTING_MANAGER) {
      if (workflow.currentStage !== WorkflowStage.PENDING_RM) {
        throw new BadRequestException(
          'Leave is not in reporting manager approval stage',
        );
      }

      if (leaveRequest.employee.reportingManagerId !== approverId) {
        throw new ForbiddenException(
          'You are not the reporting manager for this employee',
        );
      }
    } else if (rejectLeaveDto.approverType === ApproverType.HR_MANAGER) {
      if (workflow.currentStage !== WorkflowStage.PENDING_HR) {
        throw new BadRequestException(
          'Leave is not in HR manager approval stage',
        );
      }

      if (approver.role !== EmployeeRole.HR_MANAGER) {
        throw new ForbiddenException('You are not authorized as HR manager');
      }
    }

    workflow.currentStage = WorkflowStage.COMPLETED;
    leaveRequest.status = LeaveStatus.REJECTED;

    const approval = this.leaveApprovalRepository.create({
      leaveRequestId: leaveRequest.id,
      approverId,
      approverType: rejectLeaveDto.approverType,
      action: ApprovalAction.REJECT,
      comments: rejectLeaveDto.comments,
    });

    await this.leaveApprovalRepository.save(approval);
    await this.leaveWorkflowRepository.save(workflow);
    await this.leaveRequestRepository.save(leaveRequest);

    return this.findOne(leaveRequest.id);
  }

  async getApprovalHistory(
    leaveRequestId: string,
  ): Promise<ApprovalHistoryResponseDto> {
    const leaveRequest = await this.findOne(leaveRequestId);

    const approvals = await this.leaveApprovalRepository.find({
      where: { leaveRequestId },
      relations: ['approver'],
      order: { timestamp: 'ASC' },
    });

    return {
      leaveRequest: {
        id: leaveRequest.id,
        employeeId: leaveRequest.employeeId,
        employeeName: leaveRequest.employee.name,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        appliedAt: leaveRequest.appliedAt,
        documents: leaveRequest.documents,
        createdAt: leaveRequest.createdAt,
        updatedAt: leaveRequest.updatedAt,
      },
      approvals: approvals.map((approval) => ({
        id: approval.id,
        approver: `${approval.approver.name} (${approval.approverType.replace('_', ' ')})`,
        approverType: approval.approverType,
        action: approval.action,
        comments: approval.comments,
        timestamp: approval.timestamp,
      })),
    };
  }

  async getPendingApprovals(approverId: string): Promise<LeaveRequest[]> {
    const approver = await this.employeeService.findOne(approverId);

    let leaveRequests: LeaveRequest[] = [];

    if (
      approver.role === EmployeeRole.REPORTING_MANAGER ||
      approver.role === EmployeeRole.ADMIN
    ) {
      const pendingRM = await this.leaveRequestRepository
        .createQueryBuilder('leave')
        .innerJoin('leave.employee', 'employee')
        .where('employee.reportingManagerId = :approverId', { approverId })
        .andWhere('leave.status = :status', { status: LeaveStatus.PENDING })
        .getMany();

      leaveRequests = [...pendingRM];
    }

    if (
      approver.role === EmployeeRole.HR_MANAGER ||
      approver.role === EmployeeRole.ADMIN
    ) {
      const pendingHR = await this.leaveRequestRepository.find({
        where: { status: LeaveStatus.PENDING_HR },
        relations: ['employee'],
      });

      leaveRequests = [...leaveRequests, ...pendingHR];
    }

    return leaveRequests;
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  private async validateLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
  ): Promise<void> {
    const employee = await this.employeeService.findOne(employeeId);

    let balance = 0;
    let quotaName = '';

    switch (leaveType) {
      case LeaveType.CASUAL:
        balance = employee.casualLeaveBalance;
        quotaName = 'Casual';
        break;
      case LeaveType.SICK:
        balance = employee.sickLeaveBalance;
        quotaName = 'Sick';
        break;
      case LeaveType.VACATION:
        balance = employee.vacationLeaveBalance;
        quotaName = 'Vacation';
        break;
      case LeaveType.MATERNITY:
        // Maternity leave typically has different rules
        return;
      default:
        throw new BadRequestException('Invalid leave type');
    }

    if (balance < days) {
      throw new BadRequestException(
        `Insufficient ${quotaName} leave balance. Available: ${balance} days, Requested: ${days} days`,
      );
    }
  }

  private async checkOverlappingLeaves(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const overlapping = await this.leaveRequestRepository
      .createQueryBuilder('leave')
      .where('leave.employeeId = :employeeId', { employeeId })
      .andWhere('leave.status IN (:...statuses)', {
        statuses: [
          LeaveStatus.PENDING,
          LeaveStatus.PENDING_HR,
          LeaveStatus.APPROVED,
        ],
      })
      .andWhere(
        '(leave.startDate BETWEEN :startDate AND :endDate OR leave.endDate BETWEEN :startDate AND :endDate OR (leave.startDate <= :startDate AND leave.endDate >= :endDate))',
        { startDate, endDate },
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        'You have an overlapping leave request for these dates',
      );
    }
  }
}
