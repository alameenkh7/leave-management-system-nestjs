import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';

export enum WorkflowStage {
  PENDING_RM = 'pending_rm',
  PENDING_HR = 'pending_hr',
  COMPLETED = 'completed',
}

@Entity('leave_workflows')
export class LeaveWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  leaveRequestId: string;

  @OneToOne(() => LeaveRequest, (leaveRequest) => leaveRequest.workflow)
  @JoinColumn({ name: 'leaveRequestId' })
  leaveRequest: LeaveRequest;

  @Column({ default: false })
  reportingManagerApproval: boolean;

  @Column({ default: false })
  hrManagerApproval: boolean;

  @Column({
    type: 'enum',
    enum: WorkflowStage,
    default: WorkflowStage.PENDING_RM,
  })
  currentStage: WorkflowStage;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
