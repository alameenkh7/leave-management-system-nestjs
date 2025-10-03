/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from '../src/employee/employee.entity';
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

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    await cleanupDatabase();
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function cleanupDatabase() {
    await dataSource.synchronize(true);
  }

  async function setupTestData() {
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
      expect(approvalHistory.body.approvals[0].approverType).toBe(
        'reporting_manager',
      );
      expect(approvalHistory.body.approvals[1].approverType).toBe('hr_manager');

      // Step 7: Verify leave balance is deducted
      const leaveBalance = await request(app.getHttpServer())
        .get('/employees/me/leave-balance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(leaveBalance.body.casualLeave.remaining).toBe(9); // 12 - 3
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

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected routes', async () => {
      await request(app.getHttpServer()).get('/leaves').expect(401);
    });

    it('should validate JWT token', async () => {
      await request(app.getHttpServer())
        .get('/leaves')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'employee@test.com', password: 'wrongpassword' })
        .expect(401);
    });
  });
});
