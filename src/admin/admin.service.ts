import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity';
import { Employee } from '../employee/employee.entity';

export interface LeaveSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRMRequests: number;
  pendingHRRequests: number;
}

export interface DepartmentStats {
  department: string;
  totalEmployees: number;
  totalLeaveRequests: number;
  averageLeavePerEmployee: number;
  pendingApprovals: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async getLeaveSummary(): Promise<LeaveSummary> {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      pendingRMRequests,
      pendingHRRequests,
    ] = await Promise.all([
      this.leaveRequestRepository.count(),
      this.leaveRequestRepository.count({
        where: { status: LeaveStatus.PENDING },
      }),
      this.leaveRequestRepository.count({
        where: { status: LeaveStatus.APPROVED },
      }),
      this.leaveRequestRepository.count({
        where: { status: LeaveStatus.REJECTED },
      }),
      this.leaveRequestRepository.count({
        where: { status: LeaveStatus.PENDING },
      }),
      this.leaveRequestRepository.count({
        where: { status: LeaveStatus.PENDING_HR },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      pendingRMRequests,
      pendingHRRequests,
    };
  }

  async getAllPendingApprovals() {
    return this.leaveRequestRepository.find({
      where: [
        { status: LeaveStatus.PENDING },
        { status: LeaveStatus.PENDING_HR },
      ],
      relations: ['employee', 'workflow'],
      order: { appliedAt: 'ASC' },
    });
  }

  async getDepartmentStats(): Promise<DepartmentStats[]> {
    const departments = await this.employeeRepository
      .createQueryBuilder('employee')
      .select('employee.department')
      .distinct(true)
      .getRawMany();

    const stats: DepartmentStats[] = [];

    for (const dept of departments) {
      const department = dept.employee_department;

      const [totalEmployees, totalLeaveRequests] = await Promise.all([
        this.employeeRepository.count({
          where: { department, isActive: true },
        }),
        this.leaveRequestRepository
          .createQueryBuilder('leave')
          .innerJoin('leave.employee', 'employee')
          .where('employee.department = :department', { department })
          .getCount(),
      ]);

      const pendingApprovals = await this.leaveRequestRepository
        .createQueryBuilder('leave')
        .innerJoin('leave.employee', 'employee')
        .where('employee.department = :department', { department })
        .andWhere('leave.status IN (:...statuses)', {
          statuses: [LeaveStatus.PENDING, LeaveStatus.PENDING_HR],
        })
        .getCount();

      stats.push({
        department,
        totalEmployees,
        totalLeaveRequests,
        averageLeavePerEmployee: totalEmployees > 0 ?
          Math.round((totalLeaveRequests / totalEmployees) * 100) / 100 : 0,
        pendingApprovals,
      });
    }

    return stats;
  }
}