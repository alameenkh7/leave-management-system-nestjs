import { LeaveType, LeaveStatus } from '../entities/leave-request.entity';

export class LeaveResponseDto {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: Date;
  documents?: string;
  createdAt: Date;
  updatedAt: Date;
}
