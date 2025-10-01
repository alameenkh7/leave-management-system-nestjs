import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveApproval } from './entities/leave-approval.entity';
import { LeaveWorkflow } from './entities/leave-workflow.entity';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, LeaveApproval, LeaveWorkflow]),
    EmployeeModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
