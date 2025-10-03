import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: 'Type of leave being requested',
    enum: LeaveType,
    example: LeaveType.CASUAL,
    enumName: 'LeaveType'
  })
  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType: LeaveType;

  @ApiProperty({
    description: 'Start date of leave (YYYY-MM-DD format)',
    example: '2024-12-15',
    format: 'date'
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of leave (YYYY-MM-DD format)',
    example: '2024-12-17',
    format: 'date'
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Reason for leave request',
    example: 'Family function',
    minLength: 5,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Supporting documents or additional information',
    example: 'Medical certificate attached',
    required: false
  })
  @IsString()
  @IsOptional()
  documents?: string;
}
