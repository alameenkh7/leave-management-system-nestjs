import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from '../../employee/employee.entity';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../leave/entities/leave-request.entity';
import { LeaveWorkflow, WorkflowStage } from '../../leave/entities/leave-workflow.entity';
import { LeaveApproval } from '../../leave/entities/leave-approval.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  const employeeRepository = dataSource.getRepository(Employee);
  const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
  const leaveWorkflowRepository = dataSource.getRepository(LeaveWorkflow);
  const leaveApprovalRepository = dataSource.getRepository(LeaveApproval);

  // Clear existing data using query runner to handle foreign keys
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.query('TRUNCATE TABLE "leave_approvals" CASCADE');
    await queryRunner.query('TRUNCATE TABLE "leave_workflows" CASCADE');
    await queryRunner.query('TRUNCATE TABLE "leave_requests" CASCADE');
    await queryRunner.query('TRUNCATE TABLE "employees" CASCADE');
  } finally {
    await queryRunner.release();
  }

  // Create employees
  const hashedPassword = await bcrypt.hash('password123', 10);

  // HR Manager
  const hrManager = employeeRepository.create({
    employeeCode: 'HR001',
    name: 'Amit Gupta',
    email: 'amit.gupta@company.com',
    password: hashedPassword,
    department: 'HR',
    role: EmployeeRole.HR_MANAGER,
    joinDate: new Date('2020-01-15'),
    isActive: true,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
  });

  // Reporting Manager
  const reportingManager = employeeRepository.create({
    employeeCode: 'MGR001',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    password: hashedPassword,
    department: 'Engineering',
    role: EmployeeRole.REPORTING_MANAGER,
    joinDate: new Date('2019-03-10'),
    isActive: true,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
  });

  // Admin
  const admin = employeeRepository.create({
    employeeCode: 'ADM001',
    name: 'Admin User',
    email: 'admin@company.com',
    password: hashedPassword,
    department: 'IT',
    role: EmployeeRole.ADMIN,
    joinDate: new Date('2018-01-01'),
    isActive: true,
    casualLeaveBalance: 12,
    sickLeaveBalance: 10,
    vacationLeaveBalance: 18,
  });

  const savedHrManager = await employeeRepository.save(hrManager);
  const savedReportingManager = await employeeRepository.save(reportingManager);
  const savedAdmin = await employeeRepository.save(admin);

  // Regular Employees
  const employees = [
    {
      employeeCode: 'EMP001',
      name: 'Rohit Singh',
      email: 'rohit.singh@company.com',
      department: 'Engineering',
      reportingManagerId: savedReportingManager.id,
    },
    {
      employeeCode: 'EMP002',
      name: 'Neha Patel',
      email: 'neha.patel@company.com',
      department: 'Engineering',
      reportingManagerId: savedReportingManager.id,
    },
    {
      employeeCode: 'EMP003',
      name: 'Suresh Kumar',
      email: 'suresh.kumar@company.com',
      department: 'Finance',
      reportingManagerId: savedReportingManager.id,
    },
    {
      employeeCode: 'EMP004',
      name: 'Kavya Reddy',
      email: 'kavya.reddy@company.com',
      department: 'Marketing',
      reportingManagerId: savedReportingManager.id,
    },
  ];

  for (const empData of employees) {
    const employee = employeeRepository.create({
      ...empData,
      password: hashedPassword,
      role: EmployeeRole.EMPLOYEE,
      joinDate: new Date('2022-01-15'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });
    await employeeRepository.save(employee);
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:              admin@company.com / password123');
  console.log('HR Manager:         amit.gupta@company.com / password123');
  console.log('Reporting Manager:  priya.sharma@company.com / password123');
  console.log('Employee 1:         rohit.singh@company.com / password123');
  console.log('Employee 2:         neha.patel@company.com / password123');
  console.log('Employee 3:         suresh.kumar@company.com / password123');
  console.log('Employee 4:         kavya.reddy@company.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 Start the app: npm run start:dev');
  console.log('📖 Swagger UI: http://localhost:3000/api\n');
}