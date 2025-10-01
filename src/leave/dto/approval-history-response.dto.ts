import {
  ApprovalAction,
  ApproverType,
} from '../entities/leave-approval.entity';
import { LeaveResponseDto } from './leave-response.dto';

export class ApprovalDetailDto {
  id: string;
  approver: string;
  approverType: ApproverType;
  action: ApprovalAction;
  comments: string;
  timestamp: Date;
}

export class ApprovalHistoryResponseDto {
  leaveRequest: LeaveResponseDto;
  approvals: ApprovalDetailDto[];
}
