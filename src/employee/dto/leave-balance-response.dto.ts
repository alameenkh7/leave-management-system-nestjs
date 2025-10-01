export class LeaveBalanceDto {
  total: number;
  used: number;
  remaining: number;
}

export class LeaveBalanceResponseDto {
  casualLeave: LeaveBalanceDto;
  sickLeave: LeaveBalanceDto;
  vacationLeave: LeaveBalanceDto;
}
