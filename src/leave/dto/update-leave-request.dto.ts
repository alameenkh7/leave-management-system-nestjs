import { IsEnum, IsString, IsDateString, IsOptional } from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class UpdateLeaveRequestDto {
  @IsEnum(LeaveType)
  @IsOptional()
  leaveType?: LeaveType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  documents?: string;
}
