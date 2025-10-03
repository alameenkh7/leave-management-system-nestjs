import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApproverType } from '../entities/leave-approval.entity';

export class ApproveLeaveDto {
  @ApiProperty({
    description: 'Comments for the approval',
    example: 'Approved for family function',
    minLength: 5,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiProperty({
    description: 'Type of approver (reporting manager or HR manager)',
    enum: ApproverType,
    example: ApproverType.REPORTING_MANAGER,
    enumName: 'ApproverType'
  })
  @IsEnum(ApproverType)
  @IsNotEmpty()
  approverType: ApproverType;
}
