import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { Employee } from '../employee/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, Employee])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}