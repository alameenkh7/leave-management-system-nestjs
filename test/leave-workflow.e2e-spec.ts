import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from '../src/employee/employee.entity';
import { LeaveRequest, LeaveType, LeaveStatus } from '../src/leave/entities/leave-request.entity';
import { LeaveWorkflow, WorkflowStage } from '../src/leave/entities/leave-workflow.entity';
import * as bcrypt from 'bcrypt';

describe('Leave Workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeToken: string;
  let managerToken: string;
  let hrToken: string;
  let adminToken: string;
  let employeeId: string;
  let managerId: string;
  let hrId: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Clear existing data
    await dataSource.getRepository(LeaveWorkflow).delete({});
    await dataSource.getRepository(LeaveRequest).delete({});
    await dataSource.getRepository(Employee).delete({});

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test users
    const employeeRepo = dataSource.getRepository(Employee);

    const admin = employeeRepo.create({
      employeeCode: 'ADM001',
      name: 'Admin User',
      email: 'admin@test.com',
      password: hashedPassword,
      department: 'IT',
      role: EmployeeRole.ADMIN,
      joinDate: new Date('2020-01-01'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });

    const hrManager = employeeRepo.create({
      employeeCode: 'HR001',
      name: 'HR Manager',
      email: 'hr@test.com',
      password: hashedPassword,
      department: 'HR',
      role: EmployeeRole.HR_MANAGER,
      joinDate: new Date('2020-01-01'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });

    const manager = employeeRepo.create({
      employeeCode: 'MGR001',
      name: 'Reporting Manager',
      email: 'manager@test.com',
      password: hashedPassword,
      department: 'Engineering',
      role: EmployeeRole.REPORTING_MANAGER,
      joinDate: new Date('2020-01-01'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });

    const savedAdmin = await employeeRepo.save(admin);
    const savedHr = await employeeRepo.save(hrManager);
    const savedManager = await employeeRepo.save(manager);

    const employee = employeeRepo.create({
      employeeCode: 'EMP001',
      name: 'Test Employee',
      email: 'employee@test.com',
      password: hashedPassword,
      department: 'Engineering',
      role: EmployeeRole.EMPLOYEE,
      reportingManagerId: savedManager.id,
      joinDate: new Date('2022-01-01'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });

    const savedEmployee = await employeeRepo.save(employee);

    adminId = savedAdmin.id;
    hrId = savedHr.id;
    managerId = savedManager.id;
    employeeId = savedEmployee.id;

    // Get authentication tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;

    const hrLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'hr@test.com', password: 'password123' });
    hrToken = hrLogin.body.access_token;

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.com', password: 'password123' });
    managerToken = managerLogin.body.access_token;

    const employeeLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = employeeLogin.body.access_token;
  }

  async function cleanupTestData() {
    await dataSource.getRepository(LeaveWorkflow).delete({});
    await dataSource.getRepository(LeaveRequest).delete({});
    await dataSource.getRepository(Employee).delete({});
  }

  describe('Complete Leave Workflow', () => {
    it('should complete full approval workflow: Apply → RM Approve → HR Approve', async () => {
      // Step 1: Employee applies for leave
      const leaveApplication = {
        leaveType: 'casual',
        startDate: '2025-12-15',
        endDate: '2025-12-17',
        reason: 'Family function',
      };

      const applyResponse = await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveApplication)
        .expect(201);

      const leaveRequestId = applyResponse.body.id;
      expect(applyResponse.body.status).toBe('pending');
      expect(applyResponse.body.totalDays).toBe(3);

      // Step 2: Verify leave appears in manager's pending approvals
      const pendingForManager = await request(app.getHttpServer())
        .get('/leaves/pending-approvals')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(pendingForManager.body).toHaveLength(1);
      expect(pendingForManager.body[0].id).toBe(leaveRequestId);

      // Step 3: Manager approves the leave
      const managerApproval = {
        comments: 'Approved for family function',
        approverType: 'reporting_manager',
      };

      const managerApprovalResponse = await request(app.getHttpServer())
        .post(`/leaves/${leaveRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(managerApproval)
        .expect(201);

      expect(managerApprovalResponse.body.status).toBe('pending_hr');

      // Step 4: Verify leave appears in HR's pending approvals
      const pendingForHR = await request(app.getHttpServer())
        .get('/leaves/pending-approvals')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      expect(pendingForHR.body).toHaveLength(1);
      expect(pendingForHR.body[0].id).toBe(leaveRequestId);

      // Step 5: HR approves the leave
      const hrApproval = {
        comments: 'Final approval from HR',
        approverType: 'hr_manager',
      };

      const hrApprovalResponse = await request(app.getHttpServer())
        .post(`/leaves/${leaveRequestId}/approve`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send(hrApproval)
        .expect(201);

      expect(hrApprovalResponse.body.status).toBe('approved');

      // Step 6: Verify approval history
      const approvalHistory = await request(app.getHttpServer())
        .get(`/leaves/${leaveRequestId}/approval-history`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(approvalHistory.body.approvals).toHaveLength(2);
      expect(approvalHistory.body.approvals[0].approverType).toBe('reporting_manager');
      expect(approvalHistory.body.approvals[1].approverType).toBe('hr_manager');

      // Step 7: Verify leave balance is deducted
      const leaveBalance = await request(app.getHttpServer())
        .get('/employees/me/leave-balance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(leaveBalance.body.casualLeave.remaining).toBe(9); // 12 - 3
    });

    it('should handle rejection at manager level: Apply → RM Reject', async () => {
      const leaveApplication = {
        leaveType: 'casual',
        startDate: '2025-12-20',
        endDate: '2025-12-22',
        reason: 'Personal work',
      };

      // Employee applies for leave
      const applyResponse = await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveApplication)
        .expect(201);

      const leaveRequestId = applyResponse.body.id;

      // Manager rejects the leave
      const managerRejection = {
        comments: 'Project deadline conflicts',
        approverType: 'reporting_manager',
      };

      const rejectionResponse = await request(app.getHttpServer())
        .post(`/leaves/${leaveRequestId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(managerRejection)
        .expect(201);

      expect(rejectionResponse.body.status).toBe('rejected');

      // Verify approval history
      const approvalHistory = await request(app.getHttpServer())
        .get(`/leaves/${leaveRequestId}/approval-history`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(approvalHistory.body.approvals).toHaveLength(1);
      expect(approvalHistory.body.approvals[0].action).toBe('reject');
    });

    it('should handle rejection at HR level: Apply → RM Approve → HR Reject', async () => {
      const leaveApplication = {
        leaveType: 'vacation',
        startDate: '2025-12-25',
        endDate: '2025-12-30',
        reason: 'Year-end vacation',
      };

      // Employee applies for leave
      const applyResponse = await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveApplication)
        .expect(201);

      const leaveRequestId = applyResponse.body.id;

      // Manager approves
      await request(app.getHttpServer())
        .post(`/leaves/${leaveRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          comments: 'Team can manage without employee',
          approverType: 'reporting_manager',
        })
        .expect(201);

      // HR rejects
      const hrRejection = {
        comments: 'Too many vacation requests for this period',
        approverType: 'hr_manager',
      };

      const rejectionResponse = await request(app.getHttpServer())
        .post(`/leaves/${leaveRequestId}/reject`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send(hrRejection)
        .expect(201);

      expect(rejectionResponse.body.status).toBe('rejected');

      // Verify approval history has both actions
      const approvalHistory = await request(app.getHttpServer())
        .get(`/leaves/${leaveRequestId}/approval-history`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(approvalHistory.body.approvals).toHaveLength(2);
      expect(approvalHistory.body.approvals[0].action).toBe('approve');
      expect(approvalHistory.body.approvals[1].action).toBe('reject');
    });
  });

  describe('Business Rule Validations', () => {
    it('should prevent leave application for past dates', async () => {
      const pastDateApplication = {
        leaveType: 'casual',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        reason: 'Past date test',
      };

      await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(pastDateApplication)
        .expect(400);
    });

    it('should prevent self-approval', async () => {
      // Employee applies for leave
      const leaveApplication = {
        leaveType: 'sick',
        startDate: '2025-12-28',
        endDate: '2025-12-28',
        reason: 'Medical checkup',
      };

      const applyResponse = await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveApplication)
        .expect(201);

      // Employee tries to approve their own leave
      await request(app.getHttpServer())
        .post(`/leaves/${applyResponse.body.id}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          comments: 'Self approval attempt',
          approverType: 'reporting_manager',
        })
        .expect(403);
    });

    it('should prevent approval in wrong workflow stage', async () => {
      // Create a leave request
      const leaveApplication = {
        leaveType: 'casual',
        startDate: '2025-12-29',
        endDate: '2025-12-29',
        reason: 'Single day leave',
      };

      const applyResponse = await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(leaveApplication)
        .expect(201);

      // HR tries to approve before manager (wrong stage)
      await request(app.getHttpServer())
        .post(`/leaves/${applyResponse.body.id}/approve`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          comments: 'Premature HR approval',
          approverType: 'hr_manager',
        })
        .expect(400);
    });

    it('should validate leave balance before approval', async () => {
      // Apply for leave that exceeds balance
      const excessiveLeave = {
        leaveType: 'sick',
        startDate: '2025-12-10',
        endDate: '2025-12-25', // 12 working days (exceeds sick leave balance of 10)
        reason: 'Extended illness',
      };

      await request(app.getHttpServer())
        .post('/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(excessiveLeave)
        .expect(400);
    });
  });

  describe('Admin Features', () => {
    it('should provide leave summary statistics', async () => {
      const summary = await request(app.getHttpServer())
        .get('/admin/leave-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(summary.body).toHaveProperty('totalRequests');
      expect(summary.body).toHaveProperty('pendingRequests');
      expect(summary.body).toHaveProperty('approvedRequests');
      expect(summary.body).toHaveProperty('rejectedRequests');
    });

    it('should provide department statistics', async () => {
      const deptStats = await request(app.getHttpServer())
        .get('/admin/department-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(deptStats.body)).toBe(true);
      expect(deptStats.body.length).toBeGreaterThan(0);
      expect(deptStats.body[0]).toHaveProperty('department');
      expect(deptStats.body[0]).toHaveProperty('totalEmployees');
      expect(deptStats.body[0]).toHaveProperty('totalLeaveRequests');
    });

    it('should list all pending approvals for admin', async () => {
      const pendingApprovals = await request(app.getHttpServer())
        .get('/admin/pending-approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(pendingApprovals.body)).toBe(true);
    });

    it('should restrict admin endpoints to authorized users', async () => {
      await request(app.getHttpServer())
        .get('/admin/leave-summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected routes', async () => {
      await request(app.getHttpServer())
        .get('/leaves')
        .expect(401);
    });

    it('should validate JWT token', async () => {
      await request(app.getHttpServer())
        .get('/leaves')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return user info on successful login', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'employee@test.com', password: 'password123' })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('employee');
      expect(loginResponse.body.employee.email).toBe('employee@test.com');
      expect(loginResponse.body.employee.role).toBe('employee');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'employee@test.com', password: 'wrongpassword' })
        .expect(401);
    });
  });
});