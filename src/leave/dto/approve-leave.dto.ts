import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApproverType } from '../entities/leave-approval.entity';

export class ApproveLeaveDto {
  @IsString()
  @IsNotEmpty()
  comments: string;

  @IsEnum(ApproverType)
  @IsNotEmpty()
  approverType: ApproverType;
}
