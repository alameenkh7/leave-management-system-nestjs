import { LeaveRequest } from '../leave/entities/leave-request.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum EmployeeRole {
  EMPLOYEE = 'employee',
  REPORTING_MANAGER = 'reporting_manager',
  HR_MANAGER = 'hr_manager',
  ADMIN = 'admin',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  employeeCode: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  department: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
    default: EmployeeRole.EMPLOYEE,
  })
  role: EmployeeRole;

  @Column({ nullable: true })
  reportingManagerId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'reportingManagerId' })
  reportingManager: Employee;

  @Column({ type: 'date' })
  joinDate: Date;

  @Column({ default: true })
  isActive: boolean;

  // Leave balances
  @Column({ type: 'int', default: 12 })
  casualLeaveBalance: number;

  @Column({ type: 'int', default: 10 })
  sickLeaveBalance: number;

  @Column({ type: 'int', default: 18 })
  vacationLeaveBalance: number;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests: LeaveRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
