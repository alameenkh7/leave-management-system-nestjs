import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';
import { Employee } from '../../employee/employee.entity';

export enum ApproverType {
  REPORTING_MANAGER = 'reporting_manager',
  HR_MANAGER = 'hr_manager',
}

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

@Entity('leave_approvals')
export class LeaveApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  leaveRequestId: string;

  @ManyToOne(() => LeaveRequest, (leaveRequest) => leaveRequest.approvals)
  @JoinColumn({ name: 'leaveRequestId' })
  leaveRequest: LeaveRequest;

  @Column()
  approverId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'approverId' })
  approver: Employee;

  @Column({
    type: 'enum',
    enum: ApproverType,
  })
  approverType: ApproverType;

  @Column({
    type: 'enum',
    enum: ApprovalAction,
  })
  action: ApprovalAction;

  @Column({ type: 'text' })
  comments: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
