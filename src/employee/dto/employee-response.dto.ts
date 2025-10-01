import { Exclude } from 'class-transformer';

export class EmployeeResponseDto {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  role: string;
  reportingManagerId: string;
  joinDate: Date;
  isActive: boolean;
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  vacationLeaveBalance: number;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<EmployeeResponseDto>) {
    Object.assign(this, partial);
  }
}
