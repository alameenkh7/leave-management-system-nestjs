import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '../../employee/employee.entity';

export const Roles = (...roles: EmployeeRole[]) => SetMetadata('roles', roles);