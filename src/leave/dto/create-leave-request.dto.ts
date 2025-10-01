import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType: LeaveType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  documents?: string;
}
