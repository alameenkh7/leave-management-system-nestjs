import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { EmployeeRole } from '../employee.entity';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(EmployeeRole)
  @IsOptional()
  role?: EmployeeRole;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @IsDateString()
  @IsOptional()
  joinDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
