import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from '../../employee/employee.entity';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../leave/entities/leave-request.entity';
import { LeaveWorkflow, WorkflowStage } from '../../leave/entities/leave-workflow.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  const employeeRepository = dataSource.getRepository(Employee);
  const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
  const leaveWorkflowRepository = dataSource.getRepository(LeaveWorkflow);

  // Clear existing data
  await leaveWorkflowRepository.delete({});
  await leaveRequestRepository.delete({});
  await employeeRepository.delete({});

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

  const savedEmployees: Employee[] = [];
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
    savedEmployees.push(await employeeRepository.save(employee));
  }

  // Create sample leave requests
  const leaveRequests = [
    {
      employee: savedEmployees[0],
      leaveType: LeaveType.CASUAL,
      startDate: new Date('2025-12-15'),
      endDate: new Date('2025-12-17'),
      totalDays: 3,
      reason: "Sister's wedding in Jaipur",
      status: LeaveStatus.PENDING,
    },
    {
      employee: savedEmployees[1],
      leaveType: LeaveType.SICK,
      startDate: new Date('2025-12-20'),
      endDate: new Date('2025-12-20'),
      totalDays: 1,
      reason: 'Fever and medical consultation',
      status: LeaveStatus.PENDING_HR,
    },
    {
      employee: savedEmployees[2],
      leaveType: LeaveType.VACATION,
      startDate: new Date('2025-12-25'),
      endDate: new Date('2025-12-30'),
      totalDays: 4,
      reason: 'Year-end family vacation',
      status: LeaveStatus.APPROVED,
    },
  ];

  for (const leaveData of leaveRequests) {
    const leaveRequest = leaveRequestRepository.create({
      employeeId: leaveData.employee.id,
      leaveType: leaveData.leaveType,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      totalDays: leaveData.totalDays,
      reason: leaveData.reason,
      status: leaveData.status,
      appliedAt: new Date(),
    });

    const savedLeaveRequest = await leaveRequestRepository.save(leaveRequest);

    // Create workflow
    const workflow = leaveWorkflowRepository.create({
      leaveRequestId: savedLeaveRequest.id,
      reportingManagerApproval: leaveData.status !== LeaveStatus.PENDING,
      hrManagerApproval: leaveData.status === LeaveStatus.APPROVED,
      currentStage:
        leaveData.status === LeaveStatus.PENDING
          ? WorkflowStage.PENDING_RM
          : leaveData.status === LeaveStatus.PENDING_HR
          ? WorkflowStage.PENDING_HR
          : WorkflowStage.COMPLETED,
    });

    await leaveWorkflowRepository.save(workflow);
  }

  console.log('✅ Database seeded successfully!');
  console.log('Sample users:');
  console.log('- Admin: admin@company.com / password123');
  console.log('- HR Manager: amit.gupta@company.com / password123');
  console.log('- Reporting Manager: priya.sharma@company.com / password123');
  console.log('- Employee: rohit.singh@company.com / password123');
}