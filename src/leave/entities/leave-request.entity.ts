import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Employee } from '../../employee/employee.entity';
import { LeaveApproval } from './leave-approval.entity';
import { LeaveWorkflow } from './leave-workflow.entity';

export enum LeaveType {
  CASUAL = 'casual',
  SICK = 'sick',
  VACATION = 'vacation',
  MATERNITY = 'maternity',
}

export enum LeaveStatus {
  PENDING = 'pending',
  PENDING_HR = 'pending_hr',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({
    type: 'enum',
    enum: LeaveType,
  })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'int' })
  totalDays: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  appliedAt: Date;

  @Column({ nullable: true })
  documents: string;

  @OneToMany(() => LeaveApproval, (approval) => approval.leaveRequest)
  approvals: LeaveApproval[];

  @OneToOne(() => LeaveWorkflow, (workflow) => workflow.leaveRequest)
  workflow: LeaveWorkflow;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
