import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Employee, EmployeeRole } from '../src/employee/employee.entity';
import * as bcrypt from 'bcrypt';

describe('Employee Management (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let employeeToken: string;
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
    await dataSource.getRepository(Employee).delete({});

    const hashedPassword = await bcrypt.hash('password123', 10);
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

    const employee = employeeRepo.create({
      employeeCode: 'EMP001',
      name: 'Test Employee',
      email: 'employee@test.com',
      password: hashedPassword,
      department: 'Engineering',
      role: EmployeeRole.EMPLOYEE,
      joinDate: new Date('2022-01-01'),
      isActive: true,
      casualLeaveBalance: 12,
      sickLeaveBalance: 10,
      vacationLeaveBalance: 18,
    });

    const savedAdmin = await employeeRepo.save(admin);
    const savedEmployee = await employeeRepo.save(employee);

    adminId = savedAdmin.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;

    const employeeLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = employeeLogin.body.access_token;
  }

  async function cleanupTestData() {
    await dataSource.getRepository(Employee).delete({});
  }

  describe('Employee CRUD Operations', () => {
    it('should create a new employee', async () => {
      const newEmployee = {
        employeeCode: 'EMP002',
        name: 'New Employee',
        email: 'new@test.com',
        password: 'password123',
        department: 'Marketing',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmployee)
        .expect(201);

      expect(response.body.employeeCode).toBe(newEmployee.employeeCode);
      expect(response.body.name).toBe(newEmployee.name);
      expect(response.body.email).toBe(newEmployee.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should prevent duplicate employee codes', async () => {
      const duplicateEmployee = {
        employeeCode: 'EMP001',
        name: 'Duplicate Employee',
        email: 'duplicate@test.com',
        password: 'password123',
        department: 'Marketing',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateEmployee)
        .expect(409);
    });

    it('should prevent duplicate emails', async () => {
      const duplicateEmailEmployee = {
        employeeCode: 'EMP003',
        name: 'Duplicate Email Employee',
        email: 'employee@test.com',
        password: 'password123',
        department: 'Marketing',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateEmailEmployee)
        .expect(409);
    });

    it('should get all employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((emp: any) => {
        expect(emp).not.toHaveProperty('password');
      });
    });

    it('should get employee by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/employees/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.employeeCode).toBe('ADM001');
      expect(response.body.name).toBe('Admin User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app.getHttpServer())
        .get(`/employees/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should update employee information', async () => {
      const updateData = {
        name: 'Updated Admin Name',
        department: 'Updated IT',
      };

      const response = await request(app.getHttpServer())
        .patch(`/employees/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.department).toBe(updateData.department);
    });

    it('should delete employee', async () => {
      const newEmployee = {
        employeeCode: 'DEL001',
        name: 'To Delete',
        email: 'delete@test.com',
        password: 'password123',
        department: 'Temp',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmployee);

      await request(app.getHttpServer())
        .delete(`/employees/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/employees/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Leave Balance Management', () => {
    it('should get employee leave balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/me/leave-balance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('casualLeave');
      expect(response.body).toHaveProperty('sickLeave');
      expect(response.body).toHaveProperty('vacationLeave');

      expect(response.body.casualLeave).toHaveProperty('total');
      expect(response.body.casualLeave).toHaveProperty('used');
      expect(response.body.casualLeave).toHaveProperty('remaining');
    });

    it('should show correct leave balance calculations', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees/me/leave-balance')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const { casualLeave, sickLeave, vacationLeave } = response.body;

      expect(casualLeave.total).toBe(12);
      expect(casualLeave.remaining).toBe(12);
      expect(casualLeave.used).toBe(0);

      expect(sickLeave.total).toBe(10);
      expect(sickLeave.remaining).toBe(10);
      expect(sickLeave.used).toBe(0);

      expect(vacationLeave.total).toBe(18);
      expect(vacationLeave.remaining).toBe(18);
      expect(vacationLeave.used).toBe(0);
    });
  });

  describe('Authorization Tests', () => {
    it('should restrict employee creation to authorized users', async () => {
      const newEmployee = {
        employeeCode: 'UNAUTH001',
        name: 'Unauthorized Employee',
        email: 'unauth@test.com',
        password: 'password123',
        department: 'Test',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newEmployee)
        .expect(403);
    });

    it('should allow employees to view their own profile', async () => {
      await request(app.getHttpServer())
        .get('/employees/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    });

    it('should restrict admin endpoints to admin users', async () => {
      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('Validation Tests', () => {
    it('should validate required fields', async () => {
      const incompleteEmployee = {
        name: 'Incomplete Employee',
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteEmployee)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidEmailEmployee = {
        employeeCode: 'INV001',
        name: 'Invalid Email Employee',
        email: 'invalid-email',
        password: 'password123',
        department: 'Test',
        role: 'employee',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmailEmployee)
        .expect(400);
    });

    it('should validate employee role', async () => {
      const invalidRoleEmployee = {
        employeeCode: 'INV002',
        name: 'Invalid Role Employee',
        email: 'invalid@test.com',
        password: 'password123',
        department: 'Test',
        role: 'invalid_role',
        joinDate: '2024-01-01',
        casualLeaveBalance: 12,
        sickLeaveBalance: 10,
        vacationLeaveBalance: 18,
      };

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoleEmployee)
        .expect(400);
    });
  });
});